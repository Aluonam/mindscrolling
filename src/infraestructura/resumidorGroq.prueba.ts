// Se prueba lo que pasa cuando Groq dice que no.
//
// El camino feliz ya lo prueba la edición de cada mañana; lo que nunca se ve
// hasta el día que ocurre es el reparto de los 429, y ahí está la diferencia
// entre publicar veinte piezas y no publicar ninguna.
//
// La red se sustituye por una función: sin ella habría que agotar un cupo de
// verdad para probar que el cupo agotado se maneja bien.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SinCupoHoy } from '../dominio/errores.ts';
import { aMilisegundos, ResumidorGroq } from './resumidorGroq.ts';
import type { Pieza } from '../dominio/tipos.ts';

const PIEZA = {
  huella: 'ejemplo.org/uno',
  titulo: 'Un título cualquiera',
  enlace: 'https://ejemplo.org/uno',
  resumenOriginal: 'Material suficiente para escribir tres frases.',
  publicado: new Date('2026-09-01'),
  fuente: { id: 'ejemplo', nombre: 'Ejemplo', ambito: 'clinico', autoridad: 2 },
} as unknown as Pieza;

/** Un destilado válido, que es lo que devuelve Groq cuando todo va bien. */
const DESTILADO = JSON.stringify({
  texto: 'Evaluar la mano sin mirar el tronco deja fuera media explicación. ' +
    'El equipo de rehabilitación lo comprobó en consulta durante un año entero, ' +
    'y desde entonces la valoración empieza por el tronco y baja hasta los dedos.',
  clave: ['tronco', 'valoración'],
});

const respuestaOk = () =>
  new Response(JSON.stringify({ choices: [{ message: { content: DESTILADO } }] }), { status: 200 });

const respuesta429 = (cuerpo: string, cabeceras: Record<string, string> = {}) =>
  new Response(cuerpo, { status: 429, headers: cabeceras });

/**
 * Sustituye la red por una cola de respuestas y apunta a qué modelo se le pidió
 * cada una. Se restaura al terminar para no contagiar a las demás pruebas.
 */
function conRed(respuestas: Response[]) {
  const original = globalThis.fetch;
  const modelos: string[] = [];

  globalThis.fetch = (async (_url: string, opciones: { body: string }) => {
    modelos.push(JSON.parse(opciones.body).model);
    const siguiente = respuestas.shift();
    if (!siguiente) throw new Error('La prueba pidió más llamadas de las previstas.');
    return siguiente;
  }) as unknown as typeof fetch;

  return { modelos, restaurar: () => { globalThis.fetch = original; } };
}

test('sin cupo diario en el modelo bueno, la pieza se escribe con el de repuesto', async () => {
  const red = conRed([
    respuesta429('{"error":{"message":"Rate limit reached: tokens per day (TPD)"}}'),
    respuestaOk(),
  ]);

  try {
    const destilado = await new ResumidorGroq('clave').destilar(PIEZA);
    assert.match(destilado.texto, /^Evaluar la mano/);
    assert.notEqual(red.modelos[0], red.modelos[1], 'la segunda llamada debe cambiar de modelo');
  } finally {
    red.restaurar();
  }
});

test('sin cupo en los dos modelos se avisa con SinCupoHoy, no con un error cualquiera', async () => {
  const agotado = '{"error":{"message":"Rate limit reached: tokens per day (TPD)"}}';
  const red = conRed([respuesta429(agotado), respuesta429(agotado)]);

  try {
    await assert.rejects(
      () => new ResumidorGroq('clave').destilar(PIEZA),
      // El tipo es lo que importa: es lo que hace que el ciclo cierre la
      // edición con lo que lleva en vez de seguir pidiendo piezas.
      SinCupoHoy,
    );
    assert.equal(red.modelos.length, 2, 'no se insiste una tercera vez');
  } finally {
    red.restaurar();
  }
});

test('un retry-after de horas se trata como cupo agotado, no como una pausa', async () => {
  // Sin esto el ciclo se dormiría hasta mañana y el workflow moriría por
  // tiempo, sin publicar las piezas que ya tenía escritas.
  const red = conRed([respuesta429('{"error":{"message":"Rate limit reached"}}', { 'retry-after': '7200' })]);

  try {
    await assert.rejects(() => new ResumidorGroq('clave').destilar(PIEZA), SinCupoHoy);
  } finally {
    red.restaurar();
  }
});

test('un 429 del minuto no es cupo agotado: se espera y se reintenta', async () => {
  const red = conRed([
    respuesta429('{"error":{"message":"Rate limit reached: requests per minute"}}', { 'retry-after': '1' }),
    respuestaOk(),
  ]);

  try {
    const destilado = await new ResumidorGroq('clave').destilar(PIEZA);
    assert.match(destilado.texto, /^Evaluar la mano/);
    assert.equal(red.modelos[0], red.modelos[1], 'una pausa del minuto no cambia de modelo');
  } finally {
    red.restaurar();
  }
});

test('un JSON sin cerrar se vuelve a pedir, no se pierde la pieza', async () => {
  // Pasa cuando el modelo razona tanto que se queda sin sitio para responder.
  // Groq lo devuelve como 400, no como 429, y sin reintento la pieza caía.
  const red = conRed([
    new Response('{"error":{"code":"json_validate_failed","failed_generation":""}}', { status: 400 }),
    respuestaOk(),
  ]);

  try {
    const destilado = await new ResumidorGroq('clave').destilar(PIEZA);
    assert.match(destilado.texto, /^Evaluar la mano/);
  } finally {
    red.restaurar();
  }
});

test('un 400 que no es de JSON no se reintenta', async () => {
  // Un modelo retirado da 404 y un prompt inválido da 400: insistir con ellos
  // es gastar el cupo para recibir el mismo error tres veces.
  const red = conRed([new Response('{"error":{"message":"algo va mal en la petición"}}', { status: 400 })]);

  try {
    await assert.rejects(() => new ResumidorGroq('clave').destilar(PIEZA), /Groq respondió 400/);
    assert.equal(red.modelos.length, 1);
  } finally {
    red.restaurar();
  }
});

test('sin clave no se llega ni a llamar', () => {
  assert.throws(() => new ResumidorGroq(''), /GROQ_API_KEY/);
});

test('los tiempos de Groq se entienden en todos sus formatos', () => {
  // Vienen así en las cabeceras, y de ellos sale la espera entre piezas.
  assert.equal(aMilisegundos('53.115s'), 53115);
  assert.equal(aMilisegundos('615ms'), 615);
  assert.equal(aMilisegundos('1m24s'), 84000);
  assert.equal(aMilisegundos('1h24m57.599s'), 5097599);
});

test('un tiempo que no se entiende no se convierte en una espera eterna', () => {
  // Prefiere quedarse corto: el 429 se reintenta, pero una espera de horas
  // inventada deja la edición sin publicar.
  assert.equal(aMilisegundos(null), 0);
  assert.equal(aMilisegundos('vete tú a saber'), 0);
});
