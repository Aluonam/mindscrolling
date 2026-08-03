// Adaptador: cumple el puerto BuscadorDeHallazgos preguntándole a Europe PMC.
//
// Este adaptador existe porque media biblioteca clínica no publica nada que
// leer. PubMed, PMC, BioMed Central y AJOT no son blogs: son buscadores. No
// tienen "lo nuevo de hoy", tienen respuestas a preguntas.
//
// Europe PMC indexa a los cuatro y responde por API abierta, sin clave. Un
// único sitio al que preguntar en lugar de cuatro webs que nos cierran la
// puerta — AJOT, sin ir más lejos, contesta 403 a cualquier robot.
//
// Fíjate en que el puerto no ha cambiado. Sigue diciendo "alguien capaz de
// decirme qué hay nuevo en una fuente", sin nombrar RSS ni API. Por eso este
// fichero entra al lado de buscadorRss.ts sin tocar nada del dominio.

import type { BuscadorDeHallazgos } from '../dominio/puertos.ts';
import type { Fuente, Hallazgo } from '../dominio/tipos.ts';

const EXTREMO = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';

/**
 * Cuántos días hacia atrás se pregunta cuando la fuente no dice otra cosa.
 *
 * Un mes, no un día: la indexación de Europe PMC va con retraso y preguntar
 * solo por ayer devolvería vacío casi siempre. De la frescura ya se encarga el
 * dominio al puntuar; aquí solo evitamos traernos el archivo entero.
 *
 * Cada fuente puede pedir una ventana más ancha, y algunas la necesitan: AJOT
 * tarda de uno a tres meses en aparecer indexada, así que con treinta días no
 * devolvería nada nunca.
 */
const DIAS_ATRAS = 30;

type ResultadoEuropePmc = {
  title?: string;
  abstractText?: string;
  doi?: string;
  id?: string;
  source?: string;
  firstPublicationDate?: string;
  journalTitle?: string;
};

function comoFecha(dia: Date): string {
  return dia.toISOString().slice(0, 10);
}

/**
 * De dónde sale el enlace, en orden de preferencia.
 *
 * El DOI primero, siempre que se pueda: es la dirección canónica del trabajo y
 * no cambia. Eso hace que la huella del dominio deduplique bien cuando el mismo
 * artículo nos llega por Europe PMC y por el RSS de la revista.
 */
function enlaceDe(r: ResultadoEuropePmc): string {
  if (r.doi) return `https://doi.org/${r.doi}`;
  if (r.source && r.id) return `https://europepmc.org/article/${r.source}/${r.id}`;
  return '';
}

/** Lo que este adaptador necesita saber de una fuente para poder preguntarle. */
export type ConsultaPmc = {
  consulta: string;
  /** Ventana de búsqueda en días. Si no se dice, un mes. */
  diasAtras?: number;
};

export class BuscadorEuropePmc implements BuscadorDeHallazgos {
  /** Qué se le pregunta a Europe PMC por cada fuente, indexado por id. */
  private readonly consultas: Record<string, ConsultaPmc>;

  constructor(consultas: Record<string, ConsultaPmc>) {
    this.consultas = consultas;
  }

  async buscar(fuente: Fuente): Promise<Hallazgo[]> {
    const ficha = this.consultas[fuente.id];
    if (!ficha) return [];
    const { consulta, diasAtras = DIAS_ATRAS } = ficha;

    const hasta = new Date();
    const desde = new Date(hasta.getTime() - diasAtras * 86_400_000);
    const conVentana = `${consulta} AND FIRST_PDATE:[${comoFecha(desde)} TO ${comoFecha(hasta)}]`;

    const direccion =
      `${EXTREMO}?query=${encodeURIComponent(conVentana)}` +
      `&format=json&pageSize=100&resultType=core` +
      `&sort=${encodeURIComponent('P_PDATE_D desc')}`;

    const respuesta = await fetch(direccion, {
      headers: {
        'user-agent': 'MindScrolling/0.1 (+https://github.com/Aluonam/mindscrolling)',
        accept: 'application/json',
      },
    });

    if (!respuesta.ok) {
      // Igual que con el RSS: una fuente caída no tumba la edición.
      console.warn(`  · ${fuente.nombre} respondió ${respuesta.status}, se salta`);
      return [];
    }

    const cuerpo = (await respuesta.json()) as {
      resultList?: { result?: ResultadoEuropePmc[] };
    };

    return (cuerpo.resultList?.result ?? [])
      .map(r => ({
        titulo: (r.title ?? '').replace(/\s+/g, ' ').trim(),
        // El resumen del autor, tal cual. El nuestro se escribe después y
        // aparte: ese es el destilado, y es obra nuestra.
        resumenOriginal: (r.abstractText ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        enlace: enlaceDe(r),
        publicado: r.firstPublicationDate ? new Date(r.firstPublicationDate) : new Date(),
        fuente,
      }))
      .filter(h => h.titulo && h.enlace);
  }
}
