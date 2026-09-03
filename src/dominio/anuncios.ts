// Echar los anuncios antes de que cuesten nada.
//
// Los medios de tecnología viven en parte de la afiliación, y sus feeds no
// separan lo que informa de lo que vende: por el mismo canal por el que llega
// un análisis de arquitectura llega «Instacart Promo Code: $15 Off». En el
// feed de Wired uno de cada tres artículos es de la sección Deals.
//
// El filtro va en el dominio y antes de puntuar, no después: una pieza
// descartada aquí no llega a la IA, así que no gasta ni un token. Ese es todo
// el motivo de que este fichero exista y de que sea puro.
//
// Regla de diseño: ante la duda, se deja pasar. Colar un anuncio cuesta unos
// pocos tokens y una pieza mala; tirar un trabajo clínico bueno porque su
// título mencionaba un precio cuesta mucho más.

import type { Hallazgo } from './tipos.ts';

/**
 * Categorías que el propio medio pone y que no dejan lugar a dudas.
 *
 * Es la señal más fiable de todas, porque la escribe quien publica: Wired
 * etiqueta sus cupones como «Gear / Deals» y sus palabras clave como
 * «coupons, Shopping». No hay que adivinar nada.
 */
const CATEGORIAS_DE_ANUNCIO = [
  'deals', 'deal', 'coupons', 'coupon', 'shopping', 'sponsored', 'sponsor',
  'promotions', 'ofertas', 'oferta', 'compras', 'patrocinado', 'publicidad',
  'publirreportaje', 'afiliados',
];

/**
 * Trozos de dirección que solo aparecen en contenido comercial.
 *
 * Se mira la dirección y no el título porque la dirección la decide la
 * redacción al archivar la pieza, y miente mucho menos. Cada patrón viene de
 * un anuncio que se coló de verdad; el ejemplo va al lado.
 */
const RUTAS_DE_ANUNCIO = [
  'discount-code',   // wired.com/story/we-vibe-discount-code/
  'promo/code',      // wired.com/story/instacart-promo/code/
  'promo-code',
  'coupon',
  '/deals/',
  '-deal-sale',      // theverge.com/gadgets/980448/polaroid-go-...-deal-sale
  '/cupones',
  '/ofertas',
  '/sponsored',
  '/patrocinado',
  '/publirreportaje',
  'xataka-xtra',     // la sección de recomendaciones de compra de Xataka
  'xataka-seleccion',
];

/**
 * Fórmulas de título que en la práctica solo usa un anuncio.
 *
 * Aquí se es mucho más estricto que con las categorías: son expresiones
 * completas, no palabras sueltas. «Oferta» a secas descartaría «la oferta
 * formativa en terapia ocupacional»; «de descuento» no aparece en un paper.
 */
const TITULOS_DE_ANUNCIO = [
  'discount code', 'promo code', 'coupon code', 'best deals', 'top deals',
  'deals of the', 'off | ', 'las mejores ofertas', 'mejores ofertas de',
  'en oferta', 'de descuento', 'código descuento', 'codigo descuento',
  'precio mínimo', 'precio minimo', 'chollo',
];

/**
 * «Black Friday» y «Cyber Monday» estuvieron aquí y duraron una prueba.
 *
 * Descartaban «How to make your next Black Friday stress-free», de
 * Thoughtworks, que es un artículo de ingeniería sobre aguantar un pico de
 * tráfico. Las rebajas de verdad ya caen por «% off», por «ofertas» o por su
 * categoría; no hacía falta una regla que además se llevara lo bueno.
 */

/**
 * «Up to 60% Off», «$15 Off», «40% de descuento».
 *
 * El porcentaje tiene que ir pegado a una palabra de rebaja. Sin eso, la regla
 * se llevaba «Databricks ❤️ Hugging Face: up to 40% faster training», que
 * habla de velocidad y no de dinero.
 */
const REBAJA = /(\d+\s*%\s*(off|de descuento)|\$\d+\s*off)/i;

const enMinusculas = (texto: string) => texto.toLowerCase();

/**
 * ¿Esto es un anuncio?
 *
 * Tres señales, de la más fiable a la menos: lo que dice el medio de su propia
 * pieza, dónde la ha archivado, y cómo la titula. Basta una.
 */
export function esAnuncio(hallazgo: Hallazgo): boolean {
  const categorias = (hallazgo.categorias ?? []).map(enMinusculas);
  for (const categoria of categorias) {
    // Las categorías vienen jerárquicas —«Gear / Deals»— así que se compara
    // tramo a tramo. Con `includes` sobre el texto entero, «Deal» dentro de
    // «Ideal» daría un falso positivo.
    const tramos = categoria.split(/[/,>|]/).map(t => t.trim());
    if (tramos.some(t => CATEGORIAS_DE_ANUNCIO.includes(t))) return true;
  }

  const enlace = enMinusculas(hallazgo.enlace);
  if (RUTAS_DE_ANUNCIO.some(ruta => enlace.includes(ruta))) return true;

  const titulo = enMinusculas(hallazgo.titulo);
  if (TITULOS_DE_ANUNCIO.some(formula => titulo.includes(formula))) return true;

  return REBAJA.test(hallazgo.titulo);
}

/** Los hallazgos que valen, y de paso cuántos se han quedado fuera. */
export function descartarAnuncios<T extends Hallazgo>(
  hallazgos: readonly T[],
): { limpios: T[]; anuncios: T[] } {
  const limpios: T[] = [];
  const anuncios: T[] = [];

  for (const hallazgo of hallazgos) {
    (esAnuncio(hallazgo) ? anuncios : limpios).push(hallazgo);
  }

  return { limpios, anuncios };
}
