// Los puertos: lo que el dominio necesita del mundo exterior.
//
// Ojo con la dirección. Un puerto NO describe una herramienta; describe una
// necesidad. Está escrito desde dentro hacia fuera, con las palabras del
// problema y sin nombrar a nadie.
//
// Por eso aquí no aparece "RSS", ni "Claude", ni "fichero": si mañana cambias
// de proveedor, estos tres contratos siguen valiendo igual. Eso es lo que
// distingue un puerto de una interfaz cualquiera.

import type { Fuente, Hallazgo, Pieza, Destilado, Edicion } from './tipos.ts';

/** Alguien capaz de decirme qué hay nuevo en una fuente. */
export interface BuscadorDeHallazgos {
  buscar(fuente: Fuente): Promise<Hallazgo[]>;
}

/** Alguien capaz de convertir una pieza en algo que se lee en diez segundos. */
export interface Resumidor {
  destilar(pieza: Pieza): Promise<Destilado>;
  /**
   * Si tiene algo que contar de cómo fue escribiendo, lo cuenta al terminar.
   *
   * Es opcional porque no todo el que escribe tiene límites: quien no se queda
   * nunca sin cupo no implementa esto y el ciclo funciona igual.
   */
  informar?(): { cupoAgotado: boolean };
}

/** Alguien capaz de dejar una edición donde el móvil pueda leerla. */
export interface Publicador {
  publicar(edicion: Edicion): Promise<void>;
}
