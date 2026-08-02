// Adaptador: cumple el puerto Publicador escribiendo un fichero.
//
// Aquí es donde se ve por qué decidimos no usar base de datos: una edición es
// un dato que se calcula una vez y nadie toca en 24 horas. Eso es un fichero.
//
// Si algún día hiciera falta Postgres, se escribe PublicadorPostgres al lado y
// el dominio ni se entera.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Publicador } from '../dominio/puertos.ts';
import type { Edicion } from '../dominio/tipos.ts';

export class PublicadorFichero implements Publicador {
  constructor(private readonly carpeta: string) {}

  async publicar(edicion: Edicion): Promise<void> {
    await mkdir(this.carpeta, { recursive: true });

    const contenido = JSON.stringify(edicion, null, 2);

    // Dos copias a propósito: una con fecha, que es el archivo histórico y no
    // se toca nunca más, y otra fija, que es la que pide el móvil sin tener
    // que saber qué día es hoy.
    await writeFile(join(this.carpeta, `${edicion.fecha}.json`), contenido, 'utf8');
    await writeFile(join(this.carpeta, 'ultima.json'), contenido, 'utf8');
  }
}
