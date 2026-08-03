// El vocabulario del proyecto, escrito en tipos.
// Estos nombres son los mismos del glosario. Si aquí aparece otra palabra
// para lo mismo, es un error.
//
// Este fichero no importa nada. Ni red, ni ficheros, ni librerías. Es la
// definición del problema, no de la solución.

export type Ambito = 'tecnico' | 'clinico' | 'gestion';

export type Interes = {
  nombre: string;
  ambito: Ambito;
  /** Términos que delatan que una pieza trata de este tema. */
  terminos: string[];
  /** Cuánto pesa respecto a los demás. Empieza en 1. */
  peso: number;
};

export type EstadoFuente = 'candidata' | 'aprobada' | 'cuarentena' | 'descartada';

export type Fuente = {
  id: string;
  nombre: string;
  ambito: Ambito;
  estado: EstadoFuente;
  /** Cuánto confiamos en ella. Entre 0 y 2, empieza en 1. */
  autoridad: number;
};

/**
 * Lo que el catálogo guarda de una fuente además de lo que el dominio necesita.
 *
 * Nada de esto entra en la puntuación: son datos para las personas que
 * mantienen el catálogo. La dirección web sirve para volver a mirarla cuando
 * una fuente cambia de sitio, y la nota explica por qué una fuente está
 * candidata o en cuarentena en lugar de aprobada.
 */
export type FuenteCatalogada = Fuente & {
  /** El grupo temático con el que llegó al catálogo. Documenta, no decide. */
  categoria?: string;
  /** Dónde vive la fuente para una persona, no para el robot. */
  web?: string;
  /** Qué se leería cada madrugada. Si no hay, la fuente no puede estar aprobada. */
  rss?: string;
  /** Por qué está en el estado en el que está. */
  nota?: string;
};

/** Lo que una fuente ofrece, todavía sin limpiar ni evaluar. */
export type Hallazgo = {
  titulo: string;
  resumenOriginal: string;
  enlace: string;
  publicado: Date;
  fuente: Fuente;
};

/**
 * Un hallazgo ya limpio e identificado.
 * La huella es lo que permite saber que algo ya lo tenemos aunque haya
 * llegado por tres caminos distintos.
 */
export type Pieza = Hallazgo & {
  huella: string;
};

/** El resumen que escribimos nosotras. Obra nuestra, no del autor original. */
export type Destilado = {
  texto: string;
  /** Los términos que se resaltan al leer. Los elige quien escribe el resumen. */
  clave: string[];
};

export type PiezaValorada = Pieza & {
  puntuacion: number;
};

export type PiezaPublicada = PiezaValorada & {
  destilado: Destilado;
};

/**
 * El conjunto de piezas de un día.
 * Una vez publicada no cambia: por eso todo aquí es de solo lectura.
 */
export type Edicion = {
  fecha: string;
  piezas: readonly PiezaPublicada[];
};

/** Cuántas piezas puede aportar cada ámbito. Se compite dentro, no entre. */
export type Cupos = Record<Ambito, number>;
