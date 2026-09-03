// Adaptador: cumple el puerto BuscadorDeHallazgos leyendo un RSS.
//
// Toda la suciedad vive aquí: la red, el XML mal formado, las entidades HTML,
// las fechas en veinte formatos. El dominio no se entera de nada de esto.
//
// El día que haya que leer de otra cosa (arXiv, PubMed, YouTube), se escribe
// otro adaptador al lado y se cambia una línea en ejecutar.ts.

import type { BuscadorDeHallazgos } from '../dominio/puertos.ts';
import type { Fuente, Hallazgo } from '../dominio/tipos.ts';

/** Extractor mínimo. Suficiente para el esqueleto; se sustituirá por un parser real. */
function contenidoDe(bloque: string, etiqueta: string): string {
  const patron = new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`, 'i');
  const encontrado = bloque.match(patron);
  return encontrado ? limpiar(encontrado[1]) : '';
}

/**
 * Deja texto plano y legible de lo que venga.
 *
 * Dos problemas distintos, y los dos se veían en pantalla:
 *
 * 1. **El orden.** Muchos feeds mandan el HTML escapado —«&lt;p&gt;» en vez de
 *    «<p>»— y quitando etiquetas antes de decodificar no se quitaba nada: la
 *    decodificación las devolvía después y el lector acababa enseñando
 *    «<span class=...». Diez de las treinta y una piezas de una edición
 *    salieron así.
 * 2. **Las entidades numéricas.** Se decodificaban seis a mano y las demás
 *    llegaban crudas al título: «&#8216;Dragon Ball&#8217;», «&#8230;»,
 *    «&#x27;». Contadas sobre el catálogo entero eran más de mil.
 *
 * De ahí la forma: se quita, se decodifica y se repite. La segunda vuelta es
 * para los feeds que escapan dos veces, que los hay —tras una sola pasada
 * seguían quedando 372 «&quot;» y 116 «&lt;»—.
 */
export function limpiar(bruto: string): string {
  let texto = sinCdata(bruto);

  // Se decodifica y se quita, y se repite mientras algo cambie. Primero
  // decodificar y no al revés: «&lt;p&gt;» tiene que volverse «<p>» para que
  // haya algo que quitar. Y se acaba quitando, no decodificando, o un
  // «&amp;lt;p&amp;gt;» dejaría la etiqueta puesta.
  //
  // Tres vueltas son de sobra: hace falta una por capa de escapado, y no se
  // ha visto ningún feed que pase de dos.
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    const antes = texto;
    texto = sinEtiquetas(decodificar(texto));
    if (texto === antes) break;
  }

  return texto.replace(/\s+/g, ' ').trim();
}

const sinCdata = (texto: string) =>
  texto.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

/**
 * Solo lo que de verdad parece una etiqueta: «<» seguido de letra o de barra.
 *
 * Con un `<[^>]+>` a secas, un resumen clínico con «p < 0,05 y n > 30» perdía
 * el trozo de en medio. La estadística importa más que apurar la limpieza.
 */
const sinEtiquetas = (texto: string) =>
  texto.replace(/<\/?[a-z][a-z0-9]*(?:\s[^>]*)?\/?>/gi, ' ');

/**
 * Las que tienen nombre. Las numéricas no hace falta listarlas: se resuelven
 * solas más abajo, que para eso son números.
 */
const CON_NOMBRE: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  ndash: '–', mdash: '—', hellip: '…',
  laquo: '«', raquo: '»', deg: '°', middot: '·',
  euro: '€', pound: '£', trade: '™', reg: '®', copy: '©',
};

/**
 * `&#8217;` y `&#x27;` son la misma comilla escrita en decimal y en hexadecimal.
 *
 * Un código que no signifique nada se deja tal cual en vez de convertirlo en
 * un carácter roto: mejor un «&#99999;» raro que un rombo negro con
 * interrogación en mitad de una frase.
 */
function decodificar(texto: string): string {
  return texto
    .replace(/&([a-z]+);/gi, (tal, nombre: string) => CON_NOMBRE[nombre.toLowerCase()] ?? tal)
    .replace(/&#(\d+);/g, (tal, numero: string) => desdeCodigo(Number(numero), tal))
    .replace(/&#x([0-9a-f]+);/gi, (tal, numero: string) => desdeCodigo(parseInt(numero, 16), tal));
}

function desdeCodigo(codigo: number, original: string): string {
  if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return original;
  try {
    return String.fromCodePoint(codigo);
  } catch {
    return original;
  }
}

/** En Atom el enlace es un atributo, no el contenido de la etiqueta. */
function enlaceDe(bloque: string): string {
  const directo = contenidoDe(bloque, 'link');
  if (directo) return directo;

  const atributo = bloque.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atributo ? atributo[1] : '';
}

/**
 * Las categorías, que vienen de dos formas según el feed sea RSS o Atom.
 *
 * RSS las mete dentro de la etiqueta —`<category>Gear / Deals</category>`— y
 * Atom en un atributo —`<category term="Business" />`—. Se recogen las dos
 * porque los dos formatos conviven en el catálogo, y de aquí sale la señal
 * más fiable para reconocer un anuncio.
 *
 * Se añaden también `media:keywords` y `dc:subject`, que es donde Wired
 * escribe «coupons, Shopping» en sus piezas de afiliación.
 */
function categoriasDe(bloque: string): string[] {
  const dentro = [...bloque.matchAll(/<category(?:\s[^>]*)?>([\s\S]*?)<\/category>/gi)]
    .map(coincidencia => limpiar(coincidencia[1]));

  const enAtributo = [...bloque.matchAll(/<category[^>]*\bterm=["']([^"']+)["']/gi)]
    .map(coincidencia => limpiar(coincidencia[1]));

  const sueltas = ['media:keywords', 'dc:subject']
    .flatMap(etiqueta => contenidoDe(bloque, etiqueta).split(','))
    .map(palabra => palabra.trim());

  return [...dentro, ...enAtributo, ...sueltas].filter(Boolean);
}

function fechaDe(bloque: string): Date {
  for (const etiqueta of ['pubDate', 'published', 'updated', 'dc:date']) {
    const texto = contenidoDe(bloque, etiqueta);
    if (!texto) continue;
    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }
  return new Date();
}

/** Lo que se espera a una fuente antes de darla por muda, en milisegundos. */
const ESPERA_MAXIMA = 20_000;

export class BuscadorRss implements BuscadorDeHallazgos {
  // Ver la nota de publicadorFichero.ts: las propiedades de parámetro no
  // sobreviven al modo "quitar tipos y ejecutar" de Node.
  private readonly direcciones: Record<string, string>;

  constructor(direcciones: Record<string, string>) {
    this.direcciones = direcciones;
  }

  async buscar(fuente: Fuente): Promise<Hallazgo[]> {
    const direccion = this.direcciones[fuente.id];
    if (!direccion) return [];

    // Una fuente caída no puede tumbar la edición entera: se avisa y se sigue.
    //
    // El `try` no es adorno. Un 403 llega como respuesta y se maneja abajo,
    // pero un servidor que no contesta hace que `fetch` lance, y eso subía
    // hasta el `Promise.all` de ejecutar.ts y se llevaba las otras 61 fuentes.
    // Pasó en la primera ejecución de la acción diaria, con www.bsc.es.
    let respuesta: Response;
    try {
      respuesta = await fetch(direccion, {
        headers: { 'user-agent': 'MindScrolling/0.1 (+https://github.com/Aluonam/mindscrolling)' },
        // Sin esto, una fuente que acepta la conexión y luego calla deja el
        // ciclo colgado sin límite.
        signal: AbortSignal.timeout(ESPERA_MAXIMA),
      });
    } catch (error) {
      console.warn(`  · ${fuente.nombre} no responde (${(error as Error).name}), se salta`);
      return [];
    }

    if (!respuesta.ok) {
      console.warn(`  · ${fuente.nombre} respondió ${respuesta.status}, se salta`);
      return [];
    }

    const xml = await respuesta.text();
    const bloques = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) ?? [];

    return bloques
      .map(bloque => ({
        titulo: contenidoDe(bloque, 'title'),
        resumenOriginal:
          contenidoDe(bloque, 'description') ||
          contenidoDe(bloque, 'summary') ||
          contenidoDe(bloque, 'content'),
        enlace: enlaceDe(bloque),
        publicado: fechaDe(bloque),
        categorias: categoriasDe(bloque),
        fuente,
      }))
      .filter(hallazgo => hallazgo.titulo && hallazgo.enlace);
  }
}
