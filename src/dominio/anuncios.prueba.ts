// Los ejemplos de estas pruebas son reales: se colaron en una edición o se
// descartaron mal en la primera versión del filtro. Por eso están aquí, con
// su fuente y su título tal cual venían.
//
// Lo que más se prueba no es lo que se descarta, sino lo que NO se descarta:
// colar un anuncio cuesta unos tokens, y tirar un trabajo clínico bueno
// cuesta la pieza entera y no se nota hasta que alguien la echa de menos.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { descartarAnuncios, esAnuncio } from './anuncios.ts';
import type { Hallazgo } from './tipos.ts';

function hallazgo(
  titulo: string,
  { enlace = 'https://ejemplo.test/algo', categorias = [] as string[] } = {},
): Hallazgo {
  return {
    titulo,
    resumenOriginal: '',
    enlace,
    publicado: new Date('2026-09-03'),
    categorias,
    fuente: { id: 'x', nombre: 'X', ambito: 'tecnico', estado: 'aprobada', autoridad: 1 },
  } as Hallazgo;
}

// ---------------------------------------------------------------------------
// Lo que se va
// ---------------------------------------------------------------------------

test('la categoría del propio medio basta', () => {
  // Wired etiqueta así sus cupones. Es la señal más fiable que hay: la escribe
  // quien publica.
  assert.ok(esAnuncio(hallazgo('Instacart Promo Code: $15 Off', { categorias: ['Gear', 'Gear / Deals'] })));
  assert.ok(esAnuncio(hallazgo('Lo que sea', { categorias: ['Coupons'] })));
  assert.ok(esAnuncio(hallazgo('Lo que sea', { categorias: ['coupons, Shopping'] })));
});

test('la dirección delata lo que el título disimula', () => {
  const casos = [
    'https://www.wired.com/story/we-vibe-discount-code/',
    'https://www.wired.com/story/instacart-promo/code/',
    'https://www.theverge.com/gadgets/980448/polaroid-go-film-pack-bundle-deal-sale',
    'https://www.xataka.com/xataka-xtra/que-televisor-1-000-euros-me-recomendais',
  ];

  for (const enlace of casos) {
    assert.ok(esAnuncio(hallazgo('Un título de lo más neutro', { enlace })), enlace);
  }
});

test('las fórmulas de rebaja en el título', () => {
  assert.ok(esAnuncio(hallazgo('We-Vibe Discount Codes and Deals: Up to 60% Off')));
  assert.ok(esAnuncio(hallazgo('ExpressVPN Coupons: 73% Off')));
  assert.ok(esAnuncio(hallazgo('El portátil que quieres, con 200 € de descuento')));
});

// ---------------------------------------------------------------------------
// Lo que se queda
// ---------------------------------------------------------------------------

test('un artículo de ingeniería sobre Black Friday no es un anuncio', () => {
  // Thoughtworks. La primera versión del filtro se lo llevaba por decir
  // «Black Friday», y hablaba de aguantar un pico de tráfico.
  assert.ok(!esAnuncio(hallazgo('How to make your next Black Friday stress-free')));
  assert.ok(!esAnuncio(hallazgo('Black Friday is Tech Friday')));
});

test('un porcentaje que no es dinero no es una rebaja', () => {
  // Hugging Face. «Up to 40% faster» es velocidad, no descuento.
  assert.ok(!esAnuncio(hallazgo('Databricks ❤️ Hugging Face: up to 40% faster training of LLMs')));
  assert.ok(!esAnuncio(hallazgo('El 31% de los pacientes mejoró la marcha')));
});

test('«oferta» dentro de una palabra o de otra idea no cuenta', () => {
  assert.ok(!esAnuncio(hallazgo('La oferta formativa en terapia ocupacional se queda corta')));
  assert.ok(!esAnuncio(hallazgo('Ideal Gas Simulations for Undergraduate Physics')));
});

test('un precio en el título no basta: la noticia puede ir de dinero', () => {
  // Xataka. Una multa de tráfico no es una oferta.
  assert.ok(!esAnuncio(hallazgo('200 euros, seis puntos y retirada de carnet: la DGT se pone seria')));
});

test('una categoría que solo contiene la palabra dentro de otra no cuenta', () => {
  // «Ideal» contiene «deal». Se compara tramo a tramo, no con «includes».
  assert.ok(!esAnuncio(hallazgo('Lo que sea', { categorias: ['Ideal Gases'] })));
});

test('sin categorías el filtro no se rompe', () => {
  const sinCampo = { ...hallazgo('Un paper cualquiera') };
  delete (sinCampo as { categorias?: unknown }).categorias;
  assert.ok(!esAnuncio(sinCampo as Hallazgo));
});

// ---------------------------------------------------------------------------
// El reparto
// ---------------------------------------------------------------------------

test('se separan en dos montones sin perder ninguno', () => {
  const entran = [
    hallazgo('Un paper'),
    hallazgo('NordVPN Coupons: 75% Off'),
    hallazgo('Otro paper'),
  ];

  const { limpios, anuncios } = descartarAnuncios(entran);

  assert.equal(limpios.length, 2);
  assert.equal(anuncios.length, 1);
  assert.equal(limpios.length + anuncios.length, entran.length);
});
