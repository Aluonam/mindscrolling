// ¿Sirve esta web como fuente? Y si no sirve, ¿qué le falta?
//
// Lo que se decide aquí no es si la web es buena —eso lo decide una persona
// leyendo— sino si es *utilizable*: si publica un feed, si el feed trae piezas
// con lo mínimo para destilarlas, y si sigue vivo.
//
// Función pura: entra lo que se encontró al mirar y sale un informe. La red,
// el HTML y los redirectores viven en el adaptador. Así se puede probar el
// criterio entero sin pedirle nada a internet.

import type { Hallazgo } from './tipos.ts';

/** Lo que se necesita para que una fuente aporte algo de verdad. */
const MINIMO_ENTRADAS = 3;
const MESES_PARA_DARLA_POR_MUERTA = 6;

/** Un resumen más corto que esto no da para escribir un destilado honesto. */
const MINIMO_RESUMEN = 120;

export type Informe = {
  /** Si se puede añadir al catálogo tal cual. */
  sirve: boolean;
  /** Qué habría que arreglar, en palabras de quien no ha escrito el código. */
  problemas: string[];
  /** Lo que sí está bien, que también hay que contarlo. */
  bien: string[];
  entradas: number;
  conResumen: number;
  masReciente: string | null;
};

export function informar(
  hallazgos: readonly Hallazgo[],
  ahora: Date,
): Informe {
  const problemas: string[] = [];
  const bien: string[] = [];

  if (hallazgos.length === 0) {
    return {
      sirve: false,
      problemas: ['El feed no trae ninguna entrada. O está vacío, o no es un feed.'],
      bien: [],
      entradas: 0,
      conResumen: 0,
      masReciente: null,
    };
  }

  bien.push(`El feed responde y trae ${hallazgos.length} entradas.`);

  if (hallazgos.length < MINIMO_ENTRADAS) {
    problemas.push(
      `Solo trae ${hallazgos.length} entradas. Con menos de ${MINIMO_ENTRADAS} no compensa: ` +
        'ocupa un hueco en la ronda de reparto y casi nunca lo llena.',
    );
  }

  // Sin resumen el destilado se escribiría solo con el título, y eso da textos
  // que suenan a titular repetido. Es el defecto más difícil de ver después.
  const conResumen = hallazgos.filter(h => h.resumenOriginal.trim().length >= MINIMO_RESUMEN).length;
  const proporcion = conResumen / hallazgos.length;

  if (proporcion === 0) {
    problemas.push(
      'Ninguna entrada trae resumen, solo el título. La IA no tendría con qué ' +
        'escribir: haría falta leer la página de cada artículo, que es otro adaptador.',
    );
  } else if (proporcion < 0.5) {
    problemas.push(
      `Solo ${conResumen} de ${hallazgos.length} entradas traen un resumen aprovechable. ` +
        'Las demás saldrían pobres o se caerían al comprobar las normas.',
    );
  } else {
    bien.push(`${conResumen} de ${hallazgos.length} entradas traen resumen suficiente.`);
  }

  // Las fechas deciden la frescura, que es un cuarto de la puntuación. Un feed
  // sin fechas fiables entra siempre como si fuera de hoy.
  const fechas = hallazgos.map(h => h.publicado.getTime()).filter(t => Number.isFinite(t));
  const masReciente = fechas.length ? new Date(Math.max(...fechas)) : null;

  if (!masReciente) {
    problemas.push('Ninguna entrada trae fecha. Todo entraría como si se hubiera publicado hoy.');
  } else {
    const meses = (ahora.getTime() - masReciente.getTime()) / (30 * 24 * 3600 * 1000);

    if (meses > MESES_PARA_DARLA_POR_MUERTA) {
      problemas.push(
        `Lo más reciente es de hace ${Math.round(meses)} meses. El feed existe pero la web ` +
          'parece parada.',
      );
    } else {
      bien.push(`Lo último es del ${masReciente.toISOString().slice(0, 10)}.`);
    }
  }

  const conEnlace = hallazgos.filter(h => h.enlace.startsWith('http')).length;
  if (conEnlace < hallazgos.length) {
    problemas.push(
      `${hallazgos.length - conEnlace} entradas no traen un enlace utilizable al original.`,
    );
  }

  // Las categorías no hacen falta, pero son la señal más fiable para reconocer
  // un anuncio (decisión 23). Merece la pena decir si las hay.
  const conCategorias = hallazgos.filter(h => (h.categorias ?? []).length > 0).length;
  if (conCategorias > 0) {
    bien.push(`Trae categorías en ${conCategorias} entradas: sirven para filtrar publicidad.`);
  }

  return {
    sirve: problemas.length === 0,
    problemas,
    bien,
    entradas: hallazgos.length,
    conResumen,
    masReciente: masReciente ? masReciente.toISOString().slice(0, 10) : null,
  };
}

/**
 * Un identificador a partir de la dirección: «https://www.infoq.com/» → «infoq».
 *
 * Se quita el «www» y el dominio de primer nivel porque el id se escribe a mano
 * en los mensajes del registro y en las notas, y «infoq» se lee mejor que
 * «www-infoq-com».
 */
export function idDesdeLaWeb(web: string): string {
  try {
    const host = new URL(web).hostname.replace(/^www\./, '');
    const partes = host.split('.');
    const nombre = partes.length > 2 ? partes.slice(0, -2).join('-') : partes[0];
    return nombre.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  } catch {
    return '';
  }
}
