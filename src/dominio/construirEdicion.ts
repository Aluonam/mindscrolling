// El corazón del sistema: decidir qué entra en la edición de hoy.
//
// Todo lo de este fichero son funciones puras. Entra una lista, sale una lista.
// Sin red, sin ficheros, sin reloj propio (la fecha se recibe como argumento).
//
// Por eso se puede probar entero en milisegundos con datos inventados, y por
// eso el día que quieras cambiar la fórmula tienes red de seguridad.

import { descartarAnuncios } from './anuncios.ts';
import type {
  Ambito, Hallazgo, Interes, Pieza, PiezaValorada,
} from './tipos.ts';

// ---------------------------------------------------------------------------
// 1. Identificar
// ---------------------------------------------------------------------------

/**
 * La huella de una pieza: su identidad real.
 *
 * Usamos la dirección sin los parámetros de seguimiento, que es lo que hace que
 * la misma noticia llegue tres veces con tres direcciones distintas. Cuando
 * tengamos DOI o identificador de vídeo, se usarán antes que esto.
 */
export function calcularHuella(enlace: string): string {
  try {
    const url = new URL(enlace);
    url.hash = '';
    url.search = '';
    return (url.host + url.pathname).replace(/\/$/, '').toLowerCase();
  } catch {
    return enlace.trim().toLowerCase();
  }
}

export function identificar(hallazgos: readonly Hallazgo[]): Pieza[] {
  return hallazgos.map(h => ({ ...h, huella: calcularHuella(h.enlace) }));
}

// ---------------------------------------------------------------------------
// 2. Deduplicar
// ---------------------------------------------------------------------------

/** Ante dos piezas con la misma huella, se queda la de la fuente más fiable. */
export function deduplicar(piezas: readonly Pieza[]): Pieza[] {
  const porHuella = new Map<string, Pieza>();

  for (const pieza of piezas) {
    const previa = porHuella.get(pieza.huella);
    if (!previa || pieza.fuente.autoridad > previa.fuente.autoridad) {
      porHuella.set(pieza.huella, pieza);
    }
  }

  return [...porHuella.values()];
}

// ---------------------------------------------------------------------------
// 3. Puntuar
// ---------------------------------------------------------------------------

/**
 * Un término encaja si aparece como palabra, no como trozo de otra.
 *
 * Con `includes` a secas, «rendimiento» encajaba dentro de «emprendimiento» y
 * colaba una nota de prensa de una patronal en la edición. El límite va solo
 * al principio: así «autism» sigue encontrando «autismo» y «sensor» encuentra
 * «sensorial», que es justo lo que queremos de un término en inglés sobre un
 * catálogo que publica en tres idiomas.
 *
 * Las expresiones se guardan porque se usan una vez por pieza y hay miles de
 * piezas: construirlas cada vez es el gasto tonto de todo el ciclo.
 */
const expresiones = new Map<string, RegExp>();

function comoPalabra(termino: string): RegExp {
  const guardada = expresiones.get(termino);
  if (guardada) return guardada;

  const escapado = termino.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nueva = new RegExp('\\b' + escapado, 'i');
  expresiones.set(termino, nueva);
  return nueva;
}

/** Cuánto encaja una pieza con los temas que sigues. */
export function afinidad(pieza: Pieza, intereses: readonly Interes[]): number {
  const texto = (pieza.titulo + ' ' + pieza.resumenOriginal).toLowerCase();

  let mejor = 0;
  for (const interes of intereses) {
    if (interes.ambito !== pieza.fuente.ambito) continue;

    const aciertos = interes.terminos.filter(t => comoPalabra(t).test(texto)).length;
    if (aciertos === 0) continue;

    // Los aciertos suman cada vez menos: tres apariciones no valen el triple
    // que una, solo confirman que el tema es ese.
    const encaje = (1 - Math.exp(-aciertos / 2)) * interes.peso;
    mejor = Math.max(mejor, encaje);
  }

  return mejor;
}

/**
 * Lo reciente vale más, y decae de forma exponencial.
 *
 * La vida media es distinta por ámbito, y no por capricho: un blog técnico de
 * hace tres meses ya huele a viejo, pero un trabajo clínico de 2019 puede
 * seguir siendo la referencia.
 */
const VIDA_MEDIA_HORAS: Record<Ambito, number> = {
  tecnico: 48,
  clinico: 24 * 30,
  // La gestión envejece por el medio: un artículo sobre retrospectivas no
  // caduca en dos días como una noticia técnica, pero tampoco aguanta años
  // como un trabajo clínico. Una semana.
  gestion: 24 * 7,
  // Lo que no encaja en los otros tres no tiene una caducidad propia: una
  // semana es el término medio, y se ajusta el día que se sepa de qué va.
  otros: 24 * 7,
};

export function frescura(pieza: Pieza, ahora: Date): number {
  const horas = (ahora.getTime() - pieza.publicado.getTime()) / 3_600_000;
  if (horas < 0) return 1;
  return Math.exp(-horas / VIDA_MEDIA_HORAS[pieza.fuente.ambito]);
}

const PESOS = {
  afinidad: 0.55,
  autoridad: 0.20,
  frescura: 0.25,
} as const;

/**
 * Fuera lo que no encaja con ningún interés.
 *
 * Sin esto, una pieza con afinidad cero seguía sumando por autoridad y por
 * frescura —hasta 0,45 de 1— y entraba en la edición compitiendo con trabajos
 * que sí venían al caso. Así se colaron «Dragon Ball Super regresa con el
 * tráiler de su nuevo anime» y varias notas de prensa de patronales.
 *
 * Es un corte duro y a propósito: el proyecto va de dos cosas, ingeniería
 * informática y neurodiversidad. Una pieza que no toca ninguna de las dos no
 * es una edición más corta, es una edición peor.
 *
 * El precio se paga en el catálogo, no aquí: si algo bueno se cae, es que le
 * falta el término a `config/fuentes.json`. Por eso los intereses llevan
 * vocabulario en español y en catalán además de en inglés — media web del
 * catálogo publica en castellano, y antes puntuaba cero por eso solo.
 *
 * **Un ámbito sin intereses declarados no se filtra.** Es el caso de «otros
 * intereses»: ahí no hay una lista de términos que cumplir, porque el criterio
 * es que tú añadiste esa fuente a propósito. Sin esta excepción, todo lo que
 * entrara por ahí puntuaría cero y se caería entero, que es lo contrario de lo
 * que significa el ámbito.
 */
export function soloLoQueInteresa(
  valoradas: readonly PiezaValorada[],
  intereses: readonly Interes[],
): PiezaValorada[] {
  const conCriterio = new Set(intereses.map(interes => interes.ambito));

  return valoradas.filter(
    pieza => !conCriterio.has(pieza.fuente.ambito) || afinidad(pieza, intereses) > 0,
  );
}

export function puntuar(
  piezas: readonly Pieza[],
  intereses: readonly Interes[],
  ahora: Date,
): PiezaValorada[] {
  return piezas.map(pieza => ({
    ...pieza,
    puntuacion:
      PESOS.afinidad  * afinidad(pieza, intereses) +
      PESOS.autoridad * (pieza.fuente.autoridad / 2) +
      PESOS.frescura  * frescura(pieza, ahora),
  }));
}

// ---------------------------------------------------------------------------
// 4. Seleccionar
// ---------------------------------------------------------------------------

/**
 * Reparte por fuentes antes de repartir por puntuación: primero la mejor pieza
 * de cada fuente, después la segunda de cada una, y así.
 *
 * Es el mismo problema que resuelven los cupos por ámbito, un piso más abajo.
 * arXiv publica 250 trabajos al día y un blog publica uno a la semana; si se
 * ordena solo por puntuación, arXiv se lleva los cuatro huecos técnicos sin
 * ser mejor, solo por ser más. Y una edición de cuatro piezas del mismo sitio
 * no es una edición, es un listado.
 *
 * Ojo con lo que NO hace: no reserva hueco a nadie ni penaliza a las fuentes
 * prolíficas. Si un día solo publica arXiv, arXiv llena el cupo entero. Solo
 * cambia el orden en que se sirven, no quién puede entrar.
 */
function repartirEntreFuentes(
  ordenadas: readonly PiezaValorada[],
  cupo: number,
): PiezaValorada[] {
  const porFuente = new Map<string, PiezaValorada[]>();

  // Se conserva el orden de llegada, que ya viene por puntuación: la primera
  // de cada lista es la mejor de esa fuente.
  for (const pieza of ordenadas) {
    const cola = porFuente.get(pieza.fuente.id);
    if (cola) cola.push(pieza);
    else porFuente.set(pieza.fuente.id, [pieza]);
  }

  const elegidas: PiezaValorada[] = [];
  const colas = [...porFuente.values()];

  // Una vuelta por ronda: en la primera entra la mejor de cada fuente, en la
  // segunda la siguiente de cada una. Se para cuando el cupo se llena o cuando
  // ya no queda nada que repartir.
  for (let ronda = 0; elegidas.length < cupo; ronda++) {
    const deEstaRonda = colas
      .map(cola => cola[ronda])
      .filter((pieza): pieza is PiezaValorada => pieza !== undefined)
      // Dentro de una misma ronda sí manda la puntuación.
      .sort((a, b) => b.puntuacion - a.puntuacion);

    if (deEstaRonda.length === 0) break;

    elegidas.push(...deEstaRonda.slice(0, cupo - elegidas.length));
  }

  return elegidas;
}

/**
 * Cien piezas, repartidas al azar entre los ámbitos que tengan algo que dar.
 *
 * Antes cada ámbito tenía su cupo fijo —cincuenta técnicas, treinta y siete
 * clínicas, trece de gestión— y había que revisar los números cada vez que se
 * añadía un ámbito. Ahora no hay números que mantener: para cada hueco se
 * echa a suertes de qué ámbito sale, entre los que aún tengan piezas.
 *
 * Sigue compitiendo DENTRO del ámbito y no entre ámbitos, que es lo que
 * importaba de la decisión 7: si fuera un ranking único, lo técnico se
 * comería la edición entera por publicar cien veces más, no por ser mejor. El
 * sorteo es entre ámbitos, con las mismas papeletas para cada uno; dentro de
 * cada uno manda la puntuación y el reparto entre fuentes.
 *
 * Un ámbito que se queda sin piezas deja de entrar en el sorteo, y los demás
 * se reparten lo que queda. Por eso la edición sale entera aunque un día uno
 * de ellos no tenga nada.
 */
export function seleccionar(
  valoradas: readonly PiezaValorada[],
  objetivo: number,
  azar: () => number = Math.random,
): PiezaValorada[] {
  const colas = new Map<Ambito, PiezaValorada[]>();

  for (const ambito of new Set(valoradas.map(p => p.fuente.ambito))) {
    const delAmbito = valoradas
      .filter(p => p.fuente.ambito === ambito)
      .sort((a, b) => b.puntuacion - a.puntuacion);

    // El objetivo entero como tope: si es el único ámbito con material, que
    // pueda llenar la edición él solo en vez de dejarla coja.
    colas.set(ambito, repartirEntreFuentes(delAmbito, objetivo));
  }

  const elegidas: PiezaValorada[] = [];

  while (elegidas.length < objetivo) {
    const conPiezas = [...colas.values()].filter(cola => cola.length > 0);
    if (conPiezas.length === 0) break;

    const cola = conPiezas[Math.floor(azar() * conPiezas.length)];
    elegidas.push(cola.shift()!);
  }

  return elegidas;
}

// ---------------------------------------------------------------------------
// 5. El recorrido completo
// ---------------------------------------------------------------------------

/**
 * De materia bruta a lista de finalistas.
 *
 * Todavía no hay destilados: resumir cuesta dinero, así que va después, cuando
 * ya sabemos qué piezas han sobrevivido. La operación cara siempre al final
 * del embudo.
 *
 * Los anuncios se van los primeros, antes incluso de deduplicar. No es orden
 * estético: cuanto antes salgan, menos trabajo arrastran, y sobre todo ninguno
 * llega a la IA. Un cupón de Instacart no merece un token.
 */
export function construirEdicion(
  hallazgos: readonly Hallazgo[],
  intereses: readonly Interes[],
  objetivo: number,
  ahora: Date,
): PiezaValorada[] {
  const { limpios } = descartarAnuncios(hallazgos);
  const piezas = deduplicar(identificar(limpios));
  const valoradas = soloLoQueInteresa(puntuar(piezas, intereses, ahora), intereses);

  // Ya no hace falta entrelazar: el sorteo de «seleccionar» deja los ámbitos
  // mezclados por construcción, y ordenarlos después desharía el azar.
  return seleccionar(valoradas, objetivo);
}
