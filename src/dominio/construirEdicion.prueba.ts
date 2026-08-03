// Pruebas del dominio.
//
// Sin red, sin ficheros, sin reloj: todo son datos inventados y la fecha llega
// como argumento. Por eso corren en milisegundos y por eso existen — el día que
// cambie la fórmula de puntuación o el reparto, esto avisa.
//
// Se ejecutan con `npm test`. No hace falta instalar nada: el corredor viene
// dentro de Node.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calcularHuella, deduplicar, seleccionar } from './construirEdicion.ts';
import type { Ambito, Fuente, Pieza, PiezaValorada } from './tipos.ts';

function fuente(id: string, ambito: Ambito = 'tecnico', autoridad = 1): Fuente {
  return { id, nombre: id, ambito, estado: 'aprobada', autoridad };
}

function pieza(id: string, f: Fuente, puntuacion: number): PiezaValorada {
  return {
    titulo: id,
    resumenOriginal: '',
    enlace: `https://ejemplo.test/${id}`,
    publicado: new Date('2026-08-01'),
    fuente: f,
    huella: id,
    puntuacion,
  };
}

// ---------------------------------------------------------------------------
// Huella
// ---------------------------------------------------------------------------

test('la huella ignora los parámetros de seguimiento', () => {
  const limpia = calcularHuella('https://revista.test/articulo/42');
  const sucia = calcularHuella('https://revista.test/articulo/42?utm_source=boletin#top');
  assert.equal(limpia, sucia);
});

test('la huella ignora la barra final y las mayúsculas', () => {
  assert.equal(
    calcularHuella('https://Revista.test/Articulo/'),
    calcularHuella('https://revista.test/Articulo'),
  );
});

// ---------------------------------------------------------------------------
// Deduplicar
// ---------------------------------------------------------------------------

test('ante dos piezas iguales gana la fuente más fiable', () => {
  const floja: Pieza = { ...pieza('a', fuente('blog', 'tecnico', 0.8), 0), huella: 'misma' };
  const buena: Pieza = { ...pieza('a', fuente('revista', 'tecnico', 1.9), 0), huella: 'misma' };

  const resultado = deduplicar([floja, buena]);

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].fuente.id, 'revista');
});

// ---------------------------------------------------------------------------
// Seleccionar: los cupos por ámbito
// ---------------------------------------------------------------------------

test('un ámbito no invade el cupo de otro aunque puntúe más alto', () => {
  const tec = fuente('tec', 'tecnico');
  const cli = fuente('cli', 'clinico');

  const elegidas = seleccionar(
    [
      pieza('t1', tec, 0.99), pieza('t2', tec, 0.98), pieza('t3', tec, 0.97),
      pieza('c1', cli, 0.10),
    ],
    { tecnico: 1, clinico: 1, gestion: 1 },
  );

  const ambitos = elegidas.map(p => p.fuente.ambito);
  assert.deepEqual(ambitos.sort(), ['clinico', 'tecnico']);
});

test('un cupo que no se llena no se cede: la edición sale más corta', () => {
  const elegidas = seleccionar(
    [pieza('t1', fuente('tec', 'tecnico'), 0.9)],
    { tecnico: 4, clinico: 3, gestion: 1 },
  );

  assert.equal(elegidas.length, 1);
});

// ---------------------------------------------------------------------------
// Seleccionar: el reparto entre fuentes
// ---------------------------------------------------------------------------

test('una fuente prolífica no se lleva el cupo entero', () => {
  const arxiv = fuente('arxiv');
  const blog = fuente('blog');

  // arXiv gana en puntuación a todo lo demás, y aun así no puede llevarse los
  // cuatro huecos: el blog entra en la primera ronda.
  const elegidas = seleccionar(
    [
      pieza('a1', arxiv, 0.90), pieza('a2', arxiv, 0.89),
      pieza('a3', arxiv, 0.88), pieza('a4', arxiv, 0.87),
      pieza('b1', blog, 0.50),
    ],
    { tecnico: 4, clinico: 0, gestion: 0 },
  );

  assert.equal(elegidas.length, 4);
  assert.ok(
    elegidas.some(p => p.fuente.id === 'blog'),
    'el blog tenía que entrar en la primera ronda',
  );
  assert.equal(elegidas.filter(p => p.fuente.id === 'arxiv').length, 3);
});

test('dentro de una ronda sigue mandando la puntuación', () => {
  const [primera] = seleccionar(
    [
      pieza('flojo', fuente('uno'), 0.40),
      pieza('bueno', fuente('dos'), 0.95),
    ],
    { tecnico: 2, clinico: 0, gestion: 0 },
  );

  assert.equal(primera.titulo, 'bueno');
});

test('si solo publica una fuente, esa fuente llena el cupo', () => {
  const sola = fuente('unica');

  const elegidas = seleccionar(
    [pieza('u1', sola, 0.9), pieza('u2', sola, 0.8), pieza('u3', sola, 0.7)],
    { tecnico: 3, clinico: 0, gestion: 0 },
  );

  assert.equal(elegidas.length, 3);
});

test('el reparto no se cuelga cuando hay menos piezas que cupo', () => {
  const elegidas = seleccionar(
    [pieza('a', fuente('uno'), 0.9), pieza('b', fuente('dos'), 0.8)],
    { tecnico: 10, clinico: 0, gestion: 0 },
  );

  assert.equal(elegidas.length, 2);
});
