// Lo que pasa el día que la edición no llega a 100.
//
// Se prueba entero porque el fallo sería silencioso y feo a la vez: una pieza
// repetida dos veces en el mismo carril, o una de hace una semana presentada
// como si fuera de hoy.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { completarConAnteriores, cuantasHeredadas } from './completarEdicion.ts';
import type { Edicion, PiezaPublicada } from './tipos.ts';

function pieza(huella: string, extra: Partial<PiezaPublicada> = {}): PiezaPublicada {
  return {
    titulo: huella,
    resumenOriginal: '',
    enlace: `https://ejemplo.test/${huella}`,
    publicado: new Date('2026-09-01'),
    fuente: { id: 'ejemplo', nombre: 'Ejemplo', ambito: 'tecnico', estado: 'aprobada', autoridad: 1 },
    huella,
    puntuacion: 0.5,
    destilado: { texto: 'Un destilado cualquiera.', clave: ['destilado'] },
    ...extra,
  } as PiezaPublicada;
}

function edicion(fecha: string, huellas: string[], extra: Partial<PiezaPublicada> = {}): Edicion {
  return { fecha, piezas: huellas.map(h => pieza(h, extra)) };
}

test('lo que falta hoy se completa con lo de ayer', () => {
  const completa = completarConAnteriores(
    [pieza('a'), pieza('b')],
    edicion('2026-09-02', ['x', 'y', 'z']),
    4,
  );

  assert.deepEqual(completa.map(p => p.huella), ['a', 'b', 'x', 'y']);
});

test('las de hoy van primero y ninguna se cae', () => {
  const deHoy = [pieza('a'), pieza('b'), pieza('c')];
  const completa = completarConAnteriores(deHoy, edicion('2026-09-02', ['x']), 3);

  assert.deepEqual(completa.map(p => p.huella), ['a', 'b', 'c']);
});

test('una pieza que ya salió hoy no vuelve a entrar por la puerta de atrás', () => {
  // Pasa a diario: un paper de ayer que su fuente sigue publicando hoy.
  const completa = completarConAnteriores(
    [pieza('a')],
    edicion('2026-09-02', ['a', 'b']),
    5,
  );

  assert.deepEqual(completa.map(p => p.huella), ['a', 'b']);
});

test('la heredada dice de qué día viene', () => {
  const [nueva, heredada] = completarConAnteriores(
    [pieza('a')],
    edicion('2026-09-02', ['x']),
    2,
  );

  assert.equal(nueva.deOtroDia, undefined, 'lo de hoy no lleva fecha ajena');
  assert.equal(heredada.deOtroDia, '2026-09-02');
});

test('heredar en cadena conserva la fecha original, no la del salto', () => {
  // La pieza se escribió el 1, pasó por la edición del 2 y hoy entra en la
  // del 3. Sigue siendo del 1: decir «del 2» sería mentir con precisión.
  const deAyer = edicion('2026-09-02', ['x'], { deOtroDia: '2026-09-01' });
  const [, heredada] = completarConAnteriores([pieza('a')], deAyer, 2);

  assert.equal(heredada.deOtroDia, '2026-09-01');
});

test('sin edición anterior se publica lo de hoy y ya', () => {
  // El primer día del proyecto, y cualquier día que el fichero no se pueda leer.
  const completa = completarConAnteriores([pieza('a')], null, 10);

  assert.deepEqual(completa.map(p => p.huella), ['a']);
});

test('no se hereda más de lo que cabe', () => {
  const completa = completarConAnteriores([], edicion('2026-09-02', ['x', 'y', 'z']), 2);

  assert.equal(completa.length, 2);
});

test('se cuentan las heredadas, no las de hoy', () => {
  const completa = completarConAnteriores(
    [pieza('a'), pieza('b')],
    edicion('2026-09-02', ['x', 'y', 'z']),
    100,
  );

  assert.equal(completa.length, 5);
  assert.equal(cuantasHeredadas(completa), 3);
});

test('una edición entera de hoy no hereda nada', () => {
  const deHoy = [pieza('a'), pieza('b')];
  assert.equal(cuantasHeredadas(completarConAnteriores(deHoy, edicion('2026-09-02', ['x']), 2)), 0);
});
