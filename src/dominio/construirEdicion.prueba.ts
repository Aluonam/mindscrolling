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

import { afinidad, calcularHuella, deduplicar, seleccionar, soloLoQueInteresa } from './construirEdicion.ts';
import type { Ambito, Fuente, Interes, Pieza, PiezaValorada } from './tipos.ts';

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
// Seleccionar: el sorteo entre ámbitos
// ---------------------------------------------------------------------------

/** Un azar de mentira, para que la prueba dé siempre lo mismo. */
const siempre = (valor: number) => () => valor;

test('se llenan las piezas pedidas, ni una más', () => {
  const tec = fuente('tec', 'tecnico');
  const elegidas = seleccionar(
    Array.from({ length: 20 }, (_, i) => pieza(`t${i}`, tec, 1 - i / 100)),
    5,
  );

  assert.equal(elegidas.length, 5);
});

test('si no hay bastante, la edición sale más corta y no se cuelga', () => {
  const elegidas = seleccionar([pieza('t1', fuente('tec', 'tecnico'), 0.9)], 4);

  assert.equal(elegidas.length, 1);
});

test('un ámbito con mucho material no ahoga a los demás', () => {
  // Lo técnico publica cien veces más y puntúa más alto. Aun así, el sorteo
  // reparte: es lo que impide que se coma la edición entera.
  const tec = fuente('tec', 'tecnico');
  const cli = fuente('cli', 'clinico');

  const elegidas = seleccionar(
    [
      ...Array.from({ length: 200 }, (_, i) => pieza(`t${i}`, tec, 0.99)),
      ...Array.from({ length: 200 }, (_, i) => pieza(`c${i}`, cli, 0.10)),
    ],
    100,
  );

  const clinicas = elegidas.filter(p => p.fuente.ambito === 'clinico').length;
  assert.ok(clinicas > 30, `solo entraron ${clinicas} clínicas de 100`);
  assert.ok(clinicas < 70, `entraron ${clinicas} clínicas de 100`);
});

test('un ámbito que se queda sin piezas deja el hueco a los demás', () => {
  const tec = fuente('tec', 'tecnico');
  const cli = fuente('cli', 'clinico');

  const elegidas = seleccionar(
    [...Array.from({ length: 10 }, (_, i) => pieza(`t${i}`, tec, 0.9)), pieza('c1', cli, 0.9)],
    8,
  );

  // La clínica se agota enseguida y las técnicas llenan lo que falta.
  assert.equal(elegidas.length, 8);
  assert.equal(elegidas.filter(p => p.fuente.ambito === 'clinico').length, 1);
});

test('dentro de un ámbito sigue mandando la puntuación', () => {
  const tec = fuente('tec', 'tecnico');

  // Con el azar clavado en el primer ámbito, salen en su orden interno.
  const elegidas = seleccionar(
    [pieza('flojo', tec, 0.10), pieza('bueno', tec, 0.95)],
    1,
    siempre(0),
  );

  assert.equal(elegidas[0].titulo, 'bueno');
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
    4,
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
    2,
  );

  assert.equal(primera.titulo, 'bueno');
});

test('si solo publica una fuente, esa fuente llena el cupo', () => {
  const sola = fuente('unica');

  const elegidas = seleccionar(
    [pieza('u1', sola, 0.9), pieza('u2', sola, 0.8), pieza('u3', sola, 0.7)],
    3,
  );

  assert.equal(elegidas.length, 3);
});

test('el reparto no se cuelga cuando hay menos piezas que cupo', () => {
  const elegidas = seleccionar(
    [pieza('a', fuente('uno'), 0.9), pieza('b', fuente('dos'), 0.8)],
    10,
  );

  assert.equal(elegidas.length, 2);
});

// ---------------------------------------------------------------------------
// Afinidad
// ---------------------------------------------------------------------------

const INTERESES: Interes[] = [
  { nombre: 'rendimiento', ambito: 'tecnico', peso: 2, terminos: ['rendimiento', 'llm'] },
  { nombre: 'sensorial', ambito: 'clinico', peso: 2, terminos: ['autism', 'sensory integration'] },
];

function conTexto(titulo: string, resumen = '', ambito: Ambito = 'tecnico'): Pieza {
  return {
    titulo,
    resumenOriginal: resumen,
    enlace: 'https://ejemplo.test/x',
    publicado: new Date('2026-09-01'),
    fuente: fuente('f', ambito),
    huella: titulo,
  };
}

test('un término no encaja dentro de otra palabra', () => {
  // El caso real: «emprendimiento» contiene «rendimiento», y una nota de
  // prensa de una patronal se colaba entre los trabajos de ingeniería.
  const nota = conTexto('Encuentro hispano-chino sobre innovación y emprendimiento');
  assert.equal(afinidad(nota, INTERESES), 0);
});

test('pero sí encaja con la palabra entera y con sus derivadas', () => {
  assert.ok(afinidad(conTexto('Mejoras de rendimiento en el compilador'), INTERESES) > 0);
  // «autism» tiene que encontrar «autismo»: el catálogo publica en tres
  // idiomas y los términos están en inglés.
  assert.ok(afinidad(conTexto('Nuevo estudio sobre autismo', '', 'clinico'), INTERESES) > 0);
});

test('se compite dentro del ámbito, no fuera', () => {
  // Un término clínico en una pieza técnica no cuenta.
  assert.equal(afinidad(conTexto('A study on autism', '', 'tecnico'), INTERESES), 0);
});

test('lo que no encaja con ningún interés no llega a la edición', () => {
  const valoradas = [
    { ...conTexto('Dragon Ball Super regresa con el tráiler de su nuevo anime'), puntuacion: 0.45 },
    { ...conTexto('Cómo medir el rendimiento de un compilador'), puntuacion: 0.40 },
  ];

  const quedan = soloLoQueInteresa(valoradas, INTERESES);

  assert.equal(quedan.length, 1);
  assert.match(quedan[0].titulo, /compilador/);
});
