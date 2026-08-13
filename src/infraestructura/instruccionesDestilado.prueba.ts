// Se prueba porque no necesita el mundo: ni red, ni ficheros, ni reloj.
//
// Y porque su fallo es silencioso: una clave que no aparece en el texto no da
// error, simplemente no resalta nada y nadie se entera.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  aperturaPara,
  comprobarNormas,
  LIMITE_MATERIAL,
  materialDe,
  validarDestilado,
} from './instruccionesDestilado.ts';

test('un destilado bien formado pasa entero', () => {
  const d = validarDestilado({
    texto: 'Las caídas en Parkinson no dependen solo del temblor.',
    clave: ['caídas', 'temblor'],
  });

  assert.equal(d.texto, 'Las caídas en Parkinson no dependen solo del temblor.');
  assert.deepEqual(d.clave, ['caídas', 'temblor']);
});

test('se descarta la clave que no aparece en el texto', () => {
  const d = validarDestilado({
    texto: 'Garabatear es el laboratorio de la integración multisensorial.',
    clave: ['integración multisensorial', 'propiocepción'],
  });

  assert.deepEqual(d.clave, ['integración multisensorial']);
});

test('la clave cuenta aunque cambie de mayúsculas', () => {
  const d = validarDestilado({
    texto: 'El Liderazgo decide que la transformación salga bien.',
    clave: ['liderazgo'],
  });

  assert.deepEqual(d.clave, ['liderazgo']);
});

test('un destilado sin texto revienta', () => {
  assert.throws(() => validarDestilado({ clave: ['algo'] }), /no trae texto/);
  assert.throws(() => validarDestilado({ texto: '   ' }), /no trae texto/);
});

test('sin claves el destilado sigue valiendo', () => {
  const d = validarDestilado({ texto: 'Un texto cualquiera.' });
  assert.deepEqual(d.clave, []);
});

test('el Markdown se cae, en el texto y en las claves', () => {
  const d = validarDestilado({
    texto: 'Las **caídas** en Parkinson no dependen solo del *temblor*.',
    clave: ['**caídas**', 'temblor'],
  });

  assert.equal(d.texto, 'Las caídas en Parkinson no dependen solo del temblor.');
  assert.deepEqual(d.clave, ['caídas', 'temblor']);
});

test('un asterisco suelto tampoco llega a pantalla', () => {
  const d = validarDestilado({ texto: 'Texto con * suelto y _ perdido.' });
  assert.equal(d.texto, 'Texto con suelto y perdido.');
});

test('el material se recorta al límite y el resto no viaja', () => {
  const material = materialDe({
    fuente: { nombre: 'Europe PMC' },
    titulo: 'Un título',
    resumenOriginal: 'a'.repeat(LIMITE_MATERIAL + 500) + 'COLA',
  });

  assert.ok(!material.includes('COLA'));
  assert.equal(material.split('\n').at(-1)?.length, LIMITE_MATERIAL);
});

test('un resumen corto llega entero', () => {
  const material = materialDe({
    fuente: { nombre: 'Europe PMC' },
    titulo: 'Un título',
    resumenOriginal: 'Un resumen breve que cabe de sobra.',
  });

  assert.ok(material.includes('Un resumen breve que cabe de sobra.'));
});

test('se ignora lo que no sea una cadena', () => {
  const d = validarDestilado({
    texto: 'Un texto con la palabra clave dentro.',
    clave: ['clave', 42, null, '', '   '],
  });

  assert.deepEqual(d.clave, ['clave']);
});

// --- Las normas que sí se pueden comprobar en código -------------------------

test('un destilado de la longitud normal pasa las normas', () => {
  const texto = 'El cerebelo también participa en decidir, no solo en coordinar el ' +
    'movimiento. Un estudio con resonancia funcional sugiere que se activa antes ' +
    'de que la persona sea consciente de haber elegido. Queda por ver si eso ' +
    'cambia la rehabilitación.';

  assert.equal(comprobarNormas({ texto, clave: ['cerebelo'] }).texto, texto);
});

test('un destilado cortado a media frase se rechaza', () => {
  assert.throws(
    () => comprobarNormas({ texto: 'El cerebelo también participa en', clave: [] }),
    /viene cortado/,
  );
});

test('el vocabulario de bombo se rechaza aunque el texto sea largo', () => {
  const texto = 'Un hallazgo revolucionario sobre el cerebelo cambia lo que se ' +
    'sabía del movimiento, según un equipo que ha seguido a doscientas personas ' +
    'durante dos años completos en varios hospitales del país.';

  assert.throws(() => comprobarNormas({ texto, clave: [] }), /bombo/);
});

test('bombo no salta en palabras que solo se le parecen', () => {
  // "historia clínica" contiene "histori", pero no es bombo. El término
  // buscado es "histórico" con tilde, que no aparece aquí.
  const texto = 'La historia clínica en papel retrasa el alta hospitalaria una ' +
    'media de dos horas, según un estudio en cuatro hospitales. El impacto es ' +
    'mayor en los servicios con más rotación de personal.';

  assert.equal(comprobarNormas({ texto, clave: [] }).texto, texto);
});

test('las aperturas rotan y no se repiten en piezas seguidas', () => {
  const tres = [0, 1, 2].map(aperturaPara);
  assert.equal(new Set(tres).size, 3, 'las tres primeras deben ser distintas');
  assert.equal(aperturaPara(3), aperturaPara(0), 'la cuarta vuelve a empezar');
  assert.notEqual(aperturaPara(1), aperturaPara(2));
});
