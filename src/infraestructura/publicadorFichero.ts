// Adaptador: cumple el puerto Publicador escribiendo un fichero.
//
// Aquí es donde se ve por qué decidimos no usar base de datos: una edición es
// un dato que se calcula una vez y nadie toca en 24 horas. Eso es un fichero.
//
// Si algún día hiciera falta Postgres, se escribe PublicadorPostgres al lado y
// el dominio ni se entera.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Hemeroteca, Publicador } from '../dominio/puertos.ts';
import type { Edicion } from '../dominio/tipos.ts';

/**
 * Cumple los dos puertos porque los dos hablan de la misma carpeta: publicar
 * es escribir `ultima.json` y consultar la anterior es leerlo antes de
 * pisarlo. Separarlo en dos clases sería repetir la ruta en dos sitios.
 */
export class PublicadorFichero implements Publicador, Hemeroteca {
  // Declarado y asignado por separado, no como propiedad de parámetro: Node
  // ejecuta el .ts quitando los tipos, sin compilarlo, y esa forma abreviada
  // no es un tipo — genera código. Por eso no la entiende.
  readonly carpeta: string;

  constructor(carpeta: string) {
    this.carpeta = carpeta;
  }

  async publicar(edicion: Edicion): Promise<void> {
    await mkdir(this.carpeta, { recursive: true });

    const contenido = JSON.stringify(edicion, null, 2);

    // Dos copias a propósito: una con fecha, que es el archivo histórico y no
    // se toca nunca más, y otra fija, que es la que pide el móvil sin tener
    // que saber qué día es hoy.
    await writeFile(join(this.carpeta, `${edicion.fecha}.json`), contenido, 'utf8');
    await writeFile(join(this.carpeta, 'ultima.json'), contenido, 'utf8');
  }

  /**
   * La última publicada, que es la de ayer mientras no se publique la de hoy.
   *
   * Devuelve `null` y no lanza si no hay ninguna o si está ilegible: esto se
   * consulta para adornar la edición, no para construirla. Un fichero roto
   * puede dejarla más corta, nunca impedir que salga.
   */
  async ultima(): Promise<Edicion | null> {
    try {
      return JSON.parse(await readFile(join(this.carpeta, 'ultima.json'), 'utf8')) as Edicion;
    } catch {
      return null;
    }
  }
}
