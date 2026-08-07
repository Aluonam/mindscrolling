// Se prueba porque no necesita el mundo: ni red, ni ficheros, ni reloj.
//
// Y porque su fallo es silencioso: una clave que no aparece en el texto no da
// error, simplemente no resalta nada y nadie se entera.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validarDestilado } from './instruccionesDestilado.ts';

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

test('se ignora lo que no sea una cadena', () => {
  const d = validarDestilado({
    texto: 'Un texto con la palabra clave dentro.',
    clave: ['clave', 42, null, '', '   '],
  });

  assert.deepEqual(d.clave, ['clave']);
});
