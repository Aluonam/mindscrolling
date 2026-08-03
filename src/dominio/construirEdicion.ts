// El corazón del sistema: decidir qué entra en la edición de hoy.
//
// Todo lo de este fichero son funciones puras. Entra una lista, sale una lista.
// Sin red, sin ficheros, sin reloj propio (la fecha se recibe como argumento).
//
// Por eso se puede probar entero en milisegundos con datos inventados, y por
// eso el día que quieras cambiar la fórmula tienes red de seguridad.

import type {
  Ambito, Cupos, Hallazgo, Interes, Pieza, PiezaValorada,
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

/** Cuánto encaja una pieza con los temas que sigues. */
export function afinidad(pieza: Pieza, intereses: readonly Interes[]): number {
  const texto = (pieza.titulo + ' ' + pieza.resumenOriginal).toLowerCase();

  let mejor = 0;
  for (const interes of intereses) {
    if (interes.ambito !== pieza.fuente.ambito) continue;

    const aciertos = interes.terminos.filter(t => texto.includes(t.toLowerCase())).length;
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
 * Se compite DENTRO del ámbito, nunca entre ámbitos.
 *
 * Si esto fuera un ranking único, lo técnico se comería la edición entera: no
 * por ser mejor, sino por ser cien veces más. Un cupo que no se llena no se
 * cede al otro ámbito; se queda corto y ya.
 */
export function seleccionar(
  valoradas: readonly PiezaValorada[],
  cupos: Cupos,
): PiezaValorada[] {
  const elegidas: PiezaValorada[] = [];

  for (const ambito of Object.keys(cupos) as Ambito[]) {
    const delAmbito = valoradas
      .filter(p => p.fuente.ambito === ambito)
      .sort((a, b) => b.puntuacion - a.puntuacion);

    elegidas.push(...repartirEntreFuentes(delAmbito, cupos[ambito]));
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
 */
export function construirEdicion(
  hallazgos: readonly Hallazgo[],
  intereses: readonly Interes[],
  cupos: Cupos,
  ahora: Date,
): PiezaValorada[] {
  const piezas = deduplicar(identificar(hallazgos));
  return seleccionar(puntuar(piezas, intereses, ahora), cupos);
}
