// El vocabulario del proyecto, escrito en tipos.
// Estos nombres son los mismos del glosario. Si aquí aparece otra palabra
// para lo mismo, es un error.
//
// Este fichero no importa nada. Ni red, ni ficheros, ni librerías. Es la
// definición del problema, no de la solución.

export type Ambito = 'tecnico' | 'clinico' | 'gestion' | 'otros';

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
  /** Qué se leería cada madrugada, si la fuente publica un feed. */
  rss?: string;
  /**
   * Qué se le preguntaría a Europe PMC, si la fuente es un buscador y no una
   * publicación. Una fuente aprobada necesita `rss` o `consulta`: una de las
   * dos, nunca ninguna.
   */
  consulta?: string;
  /**
   * Cuántos días hacia atrás pregunta esa consulta. Solo hace falta cuando la
   * fuente tarda en aparecer indexada y la ventana normal la dejaría muda.
   */
  diasAtras?: number;
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
  /**
   * Cómo clasifica el medio su propia pieza, tal cual viene en el feed.
   *
   * Ausente en las fuentes que no las publican, que son muchas. Sirve para
   * reconocer un anuncio sin adivinar: quien etiqueta «Gear / Deals» lo está
   * diciendo él mismo.
   */
  categorias?: readonly string[];
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
  /**
   * La fecha de la edición en la que se escribió, si no fue hoy.
   *
   * Ausente en lo nuevo, que es lo normal. Lo llevan las piezas heredadas de
   * una edición anterior para rellenar un día de sequía, y guarda su fecha de
   * origen aunque hayan pasado por varias ediciones desde entonces.
   */
  deOtroDia?: string;
};

/**
 * Cómo salió la edición, contado para quien la lee y no para quien la opera.
 *
 * Existe porque la edición puede salir coja sin que nada falle a la vista: se
 * acaba el cupo de la IA, una pieza no pasa las normas tres veces seguidas, y
 * el lector enseña 60 piezas donde debía haber 100 sin decir por qué. Quien
 * lee se merece saberlo, aunque sea en una línea.
 *
 * Lo que va aquí es lo que se le puede enseñar a una persona. El detalle
 * operativo —qué fuentes cayeron, qué modelo escribió cada pieza— sigue
 * viviendo en el registro de la acción, que es donde sirve.
 */
export type Incidencias = {
  /** Cuántas piezas debía traer la edición. */
  previstas: number;
  /** Cuántas llegaron a publicarse. */
  publicadas: number;
  /**
   * El modelo bueno se quedó sin cupo del día y el resto de la edición la
   * escribió el de repuesto, que escribe peor.
   */
  cupoAgotado: boolean;
  /**
   * Cuántas de las publicadas vienen de ediciones anteriores.
   *
   * Ausente en las ediciones anteriores a que se heredara nada. Cero y ausente
   * significan lo mismo: todo lo de hoy se escribió hoy.
   */
  heredadas?: number;
};

/**
 * El conjunto de piezas de un día.
 * Una vez publicada no cambia: por eso todo aquí es de solo lectura.
 */
export type Edicion = {
  fecha: string;
  piezas: readonly PiezaPublicada[];
  /** Ausente en las ediciones publicadas antes de que esto existiera. */
  incidencias?: Incidencias;
};

// Aquí vivía «Cupos», un número de piezas por ámbito. Se fue el día que el
// reparto pasó a echarse a suertes: no había números que mantener, y cada
// ámbito nuevo obligaba a repartir de nuevo los cien huecos a mano.
