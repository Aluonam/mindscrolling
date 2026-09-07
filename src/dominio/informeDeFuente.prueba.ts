// El criterio de si una web sirve como fuente.
//
// Se prueba porque es lo que va a leer una persona cuando el formulario le
// diga que no: si el motivo está mal, se queda sin saber qué hacer. Y porque
// equivocarse por el otro lado es peor — una fuente que entra sin resúmenes da
// destilados que suenan a titular repetido, y eso no se ve hasta semanas
// después.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { idDesdeLaWeb, informar } from './informeDeFuente.ts';
import type { Hallazgo } from './tipos.ts';

const AHORA = new Date('2026-09-07T10:00:00Z');

const RESUMEN_LARGO =
  'Un resumen de los de verdad, con espacio suficiente para que la inteligencia ' +
  'artificial tenga algo que destilar sin inventarse la mitad del contenido.';

function entrada(extra: Partial<Hallazgo> = {}): Hallazgo {
  return {
    titulo: 'Un título cualquiera',
    resumenOriginal: RESUMEN_LARGO,
    enlace: 'https://ejemplo.test/pieza',
    publicado: new Date('2026-09-05'),
    categorias: [],
    fuente: { id: 'x', nombre: 'X', ambito: 'tecnico', estado: 'aprobada', autoridad: 1 },
    ...extra,
  } as Hallazgo;
}

const varias = (cuantas: number, extra: Partial<Hallazgo> = {}) =>
  Array.from({ length: cuantas }, () => entrada(extra));

test('un feed sano sirve', () => {
  const informe = informar(varias(10), AHORA);

  assert.equal(informe.sirve, true);
  assert.deepEqual(informe.problemas, []);
  assert.equal(informe.entradas, 10);
  assert.equal(informe.masReciente, '2026-09-05');
});

test('un feed vacío no es un feed', () => {
  const informe = informar([], AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas[0], /ninguna entrada/i);
});

test('sin resúmenes no hay con qué escribir', () => {
  // El caso real: el feed de Overreacted trae 58 entradas y solo el título.
  const informe = informar(varias(8, { resumenOriginal: '' }), AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas.join(' '), /Ninguna entrada trae resumen/);
});

test('con la mitad de los resúmenes flojos también se avisa', () => {
  const informe = informar([...varias(3), ...varias(7, { resumenOriginal: 'Corto.' })], AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas.join(' '), /Solo 3 de 10/);
});

test('tres entradas es el suelo', () => {
  assert.equal(informar(varias(2), AHORA).sirve, false);
  assert.equal(informar(varias(3), AHORA).sirve, true);
});

test('un feed parado se nota por la fecha', () => {
  const informe = informar(varias(10, { publicado: new Date('2025-01-01') }), AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas.join(' '), /parada/);
});

test('sin fechas todo entraría como si fuera de hoy', () => {
  const informe = informar(varias(10, { publicado: new Date('nada') }), AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas.join(' '), /Ninguna entrada trae fecha/);
});

test('las entradas sin enlace se cuentan', () => {
  const informe = informar([...varias(8), ...varias(2, { enlace: '' })], AHORA);

  assert.equal(informe.sirve, false);
  assert.match(informe.problemas.join(' '), /2 entradas no traen un enlace/);
});

test('las categorías no hacen falta, pero se dicen', () => {
  const conEllas = informar(varias(5, { categorias: ['Deals'] }), AHORA);

  assert.equal(conEllas.sirve, true);
  assert.match(conEllas.bien.join(' '), /categorías/);
});

test('el identificador sale del dominio, sin www ni terminación', () => {
  assert.equal(idDesdeLaWeb('https://www.infoq.com/'), 'infoq');
  assert.equal(idDesdeLaWeb('https://martinfowler.com'), 'martinfowler');
  assert.equal(idDesdeLaWeb('https://blog.acolyer.org/algo'), 'blog');
  assert.equal(idDesdeLaWeb('no es una dirección'), '');
});
