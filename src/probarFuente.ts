// Comprobar si una web sirve como fuente, y añadirla si sirve.
//
// Lo ejecuta la acción «Probar una fuente», que se lanza desde el panel del
// móvil. Vive en el servidor y no en el navegador por un motivo tonto pero
// insalvable: el navegador no puede leer webs ajenas —lo bloquea el propio
// navegador—, así que la comprobación tenía que pasar por algún sitio con red
// de verdad. Esto es ese sitio.
//
// Escribe siempre `config/informe.json`, sirva o no: el panel lo lee y cuenta
// el resultado. Si sirve, además la añade al catálogo.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { informar, idDesdeLaWeb } from './dominio/informeDeFuente.ts';
import { buscarFeed } from './infraestructura/buscadorDeFeeds.ts';
import { hallazgosDe } from './infraestructura/buscadorRss.ts';
import type { Ambito, Fuente } from './dominio/tipos.ts';

const CONFIG = new URL('../config/fuentes.json', import.meta.url);
const INFORME = new URL('../config/informe.json', import.meta.url);

/** Nueva y aprobada: la autoridad se sube a mano cuando se ha leído un tiempo. */
const AUTORIDAD_DE_ESTRENO = 1;

async function main() {
  const web = (process.env.WEB ?? '').trim();
  const ambito = (process.env.AMBITO ?? 'tecnico').trim() as Ambito;
  const nombre = (process.env.NOMBRE ?? '').trim();

  if (!web) throw new Error('Falta la web que hay que probar.');

  const config = JSON.parse(await readFile(CONFIG, 'utf8'));
  const id = idDesdeLaWeb(web);

  // Antes de gastar peticiones: ¿no la teníamos ya?
  const repetida = config.fuentes.find(
    (f: Fuente & { web?: string }) => f.id === id || (f.web && mismaWeb(f.web, web)),
  );

  if (repetida) {
    return escribir({
      web,
      sirve: false,
      titulo: `${repetida.nombre} ya está en el catálogo`,
      problemas: [
        repetida.estado === 'aprobada'
          ? 'Ya está activa: lo que lee la edición de cada día.'
          : `Está en el catálogo como «${repetida.estado}». Se puede encender desde la lista.`,
      ],
      bien: [],
    });
  }

  console.log(`Buscando el feed de ${web}…`);
  const { hallado, respondio, declaraba } = await buscarFeed(web);

  if (!hallado) {
    return escribir({ web, sirve: false, ...porQueNo(respondio, declaraba) });
  }

  console.log(`Feed encontrado (${hallado.como}): ${hallado.feed}`);

  const fuente: Fuente = {
    id,
    nombre: nombre || id,
    ambito,
    estado: 'aprobada',
    autoridad: AUTORIDAD_DE_ESTRENO,
  } as Fuente;

  const informe = informar(hallazgosDe(hallado.xml, fuente), new Date());

  if (!informe.sirve) {
    return escribir({
      web,
      feed: hallado.feed,
      sirve: false,
      titulo: 'El feed responde, pero no vale tal cual',
      problemas: informe.problemas,
      bien: informe.bien,
    });
  }

  // Sirve: entra en el catálogo, con la nota de cuándo y cómo se comprobó.
  config.fuentes.push({
    ...fuente,
    categoria: 'Anadida desde el panel',
    web,
    rss: hallado.feed,
    nota: `Anadida el ${new Date().toISOString().slice(0, 10)} desde el panel. ` +
      `Feed ${hallado.como}. Al comprobarla traia ${informe.entradas} entradas, ` +
      `${informe.conResumen} con resumen suficiente, la ultima del ${informe.masReciente}.`,
  });

  await writeFile(CONFIG, JSON.stringify(config, null, 2) + '\n', 'utf8');

  await escribir({
    web,
    feed: hallado.feed,
    sirve: true,
    titulo: `${fuente.nombre} añadida al catálogo`,
    problemas: [],
    bien: [...informe.bien, 'Entrará en la edición de mañana.'],
  });
}

/**
 * Por qué no hay feed, en las tres formas en que puede no haberlo.
 *
 * Son tres situaciones que piden cosas distintas, y decir «no se encuentra
 * ningún feed» a las tres deja a quien pregunta sin saber qué hacer.
 */
function porQueNo(respondio: boolean, declaraba: number) {
  if (!respondio) {
    return {
      titulo: 'La web no responde',
      problemas: [
        'No ha contestado en quince segundos. Puede estar caída, o la dirección ' +
          'puede tener una errata.',
      ],
      bien: [],
    };
  }

  if (declaraba > 0) {
    return {
      titulo: 'Publica un feed, pero no nos deja leerlo',
      problemas: [
        `La web declara ${declaraba} feed${declaraba > 1 ? 's' : ''} en su cabecera, pero al pedirlo ` +
          'contesta con una página normal. Suele ser una protección antirrobots: ' +
          'Nature y algún periódico hacen esto.',
        'No hay nada que arreglar por nuestra parte. Si la quieres, hay que ' +
          'buscarle otra vía —una API, un espejo del feed— y eso es código.',
      ],
      bien: ['La web existe y responde.'],
    };
  }

  return {
    titulo: 'No se encuentra ningún feed',
    problemas: [
      'La web no declara un feed en su cabecera y tampoco responde en las rutas ' +
        'habituales (/feed, /rss, /feed.xml…).',
      'Si sabes la dirección exacta del RSS, pégala aquí directamente en vez de la web.',
      'Y si esta web sencillamente no publica feed, haría falta escribirle un ' +
        'adaptador propio: no es un formulario, es código.',
    ],
    bien: ['La web existe y responde.'],
  };
}

/** Dos direcciones apuntan al mismo sitio si coincide el dominio. */
function mismaWeb(una: string, otra: string): boolean {
  try {
    const limpia = (d: string) => new URL(d).hostname.replace(/^www\./, '').toLowerCase();
    return limpia(una) === limpia(otra);
  } catch {
    return false;
  }
}

type Resultado = {
  web: string;
  feed?: string;
  sirve: boolean;
  titulo: string;
  problemas: string[];
  bien: string[];
};

async function escribir(resultado: Resultado) {
  await writeFile(
    INFORME,
    JSON.stringify({ ...resultado, cuando: new Date().toISOString() }, null, 2) + '\n',
    'utf8',
  );

  console.log(`\n${resultado.sirve ? '✓' : '✗'} ${resultado.titulo}`);
  for (const linea of resultado.problemas) console.log(`  · ${linea}`);
  for (const linea of resultado.bien) console.log(`  ✓ ${linea}`);
  console.log(`\nInforme en ${fileURLToPath(INFORME)}`);
}

main().catch(async error => {
  // Un fallo también es un resultado: el panel se quedaría esperando para siempre.
  await escribir({
    web: process.env.WEB ?? '',
    sirve: false,
    titulo: 'La comprobación falló',
    problemas: [(error as Error).message],
    bien: [],
  });
  process.exitCode = 1;
});
