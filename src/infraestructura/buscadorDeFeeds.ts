// Encontrar el feed de una web a partir de su dirección.
//
// Es lo que permite que el formulario pida solo la web: nadie tiene por qué
// saber dónde esconde cada medio su RSS. Se prueba, por este orden, lo que la
// propia página declara y luego las rutas de siempre.
//
// Vive en infraestructura porque es todo suciedad: red, HTML mal cerrado,
// redirecciones y servidores que contestan 403 a quien no parece un navegador.

/** Lo que se espera a una web antes de darla por muda. */
const ESPERA_MAXIMA = 15_000;

/**
 * Las rutas que usa casi todo el mundo, por orden de probabilidad.
 *
 * Se prueban solo si la página no declara ninguna, que es lo que pasa en los
 * blogs viejos y en algunos WordPress con el `<head>` recortado.
 */
const RUTAS_HABITUALES = [
  '/feed', '/rss', '/feed.xml', '/rss.xml', '/index.xml',
  '/atom.xml', '/feed/atom', '/blog/feed', '/feeds/posts/default',
];

const CABECERAS = {
  // Sin un agente reconocible, unos cuantos medios contestan 403 de entrada.
  'user-agent': 'MindScrolling/0.1 (+https://github.com/Aluonam/mindscrolling)',
  accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8',
};

async function pedir(direccion: string): Promise<Response | null> {
  try {
    return await fetch(direccion, {
      headers: CABECERAS,
      redirect: 'follow',
      signal: AbortSignal.timeout(ESPERA_MAXIMA),
    });
  } catch {
    return null;
  }
}

/**
 * ¿Esto es un feed? Se mira el contenido, no la extensión ni el tipo MIME.
 *
 * Los tres formatos que hay por ahí: RSS 2.0 abre en «<rss», Atom en «<feed» y
 * RSS 1.0 en «<rdf:RDF». El tercero parece antiguo y lo usan sitios que no lo
 * son: Nature publica así sus revistas, y sin esta línea se quedaban fuera.
 */
function pareceFeed(texto: string): boolean {
  return /<(rss|feed|rdf:RDF)[\s>]/i.test(texto.slice(0, 2000));
}

/** Los feeds que la página declara en su cabecera, en el orden en que aparecen. */
function declarados(html: string, base: string): string[] {
  const enlaces = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);

  return enlaces
    .filter(etiqueta => /rel=["']?alternate/i.test(etiqueta))
    .filter(etiqueta => /type=["'][^"']*(rss|atom)\+xml/i.test(etiqueta))
    .map(etiqueta => etiqueta.match(/href=["']([^"']+)["']/i)?.[1])
    .filter((href): href is string => Boolean(href))
    .map(href => absoluta(href, base))
    .filter((href): href is string => Boolean(href));
}

function absoluta(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

export type Hallado = {
  /** La dirección del feed que ha funcionado. */
  feed: string;
  /** El XML, ya descargado: quien llama no tiene que volver a pedirlo. */
  xml: string;
  /** Cómo se encontró, para poder contarlo. */
  como: 'la dirección ya era un feed' | 'declarado en la página' | 'ruta habitual';
};

export type Busqueda = {
  hallado: Hallado | null;
  /** Si la web llegó a contestar algo. */
  respondio: boolean;
  /** Cuántos feeds declaraba su cabecera. Distingue «no tiene» de «no me deja». */
  declaraba: number;
};

/**
 * Busca el feed y cuenta cómo fue, no solo si lo encontró.
 *
 * La diferencia importa al explicárselo a alguien: «esta web no publica feed»
 * y «esta web publica feed pero no nos deja leerlo» piden cosas distintas. Con
 * un simple null no se podían distinguir, y Nature —que declara su RSS y luego
 * sirve una pantalla antirrobots— salía como si no tuviera ninguno.
 *
 * Se descarga el XML aquí y se devuelve junto a la dirección para no pedir dos
 * veces lo mismo: algunos medios limitan por peticiones y esto ya hace varias.
 */
export async function buscarFeed(web: string): Promise<Busqueda> {
  let respondio = false;
  let declaraba = 0;

  const directa = await pedir(web);
  if (directa?.ok) {
    respondio = true;
    const texto = await directa.text();

    // La dirección que han pegado ya era el feed. Pasa más de lo que parece:
    // se copia del lector de feeds, no de la barra del navegador.
    if (pareceFeed(texto)) {
      return {
        hallado: { feed: directa.url || web, xml: texto, como: 'la dirección ya era un feed' },
        respondio,
        declaraba,
      };
    }

    const candidatos = declarados(texto, directa.url || web);
    declaraba = candidatos.length;

    for (const candidato of candidatos) {
      const hallado = await probar(candidato, 'declarado en la página');
      if (hallado) return { hallado, respondio, declaraba };
    }
  }

  for (const ruta of RUTAS_HABITUALES) {
    const candidato = absoluta(ruta, web);
    if (!candidato) continue;

    const hallado = await probar(candidato, 'ruta habitual');
    if (hallado) return { hallado, respondio, declaraba };
  }

  return { hallado: null, respondio, declaraba };
}

async function probar(direccion: string, como: Hallado['como']): Promise<Hallado | null> {
  const respuesta = await pedir(direccion);
  if (!respuesta?.ok) return null;

  const xml = await respuesta.text();
  return pareceFeed(xml) ? { feed: respuesta.url || direccion, xml, como } : null;
}
