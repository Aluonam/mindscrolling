// Adaptador: cumple el puerto BuscadorDeHallazgos leyendo un RSS.
//
// Toda la suciedad vive aquí: la red, el XML mal formado, las entidades HTML,
// las fechas en veinte formatos. El dominio no se entera de nada de esto.
//
// El día que haya que leer de otra cosa (arXiv, PubMed, YouTube), se escribe
// otro adaptador al lado y se cambia una línea en ejecutar.ts.

import type { BuscadorDeHallazgos } from '../dominio/puertos.ts';
import type { Fuente, Hallazgo } from '../dominio/tipos.ts';

/** Extractor mínimo. Suficiente para el esqueleto; se sustituirá por un parser real. */
function contenidoDe(bloque: string, etiqueta: string): string {
  const patron = new RegExp(`<${etiqueta}(?:\\s[^>]*)?>([\\s\\S]*?)</${etiqueta}>`, 'i');
  const encontrado = bloque.match(patron);
  return encontrado ? limpiar(encontrado[1]) : '';
}

function limpiar(bruto: string): string {
  return bruto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** En Atom el enlace es un atributo, no el contenido de la etiqueta. */
function enlaceDe(bloque: string): string {
  const directo = contenidoDe(bloque, 'link');
  if (directo) return directo;

  const atributo = bloque.match(/<link[^>]*href=["']([^"']+)["']/i);
  return atributo ? atributo[1] : '';
}

function fechaDe(bloque: string): Date {
  for (const etiqueta of ['pubDate', 'published', 'updated', 'dc:date']) {
    const texto = contenidoDe(bloque, etiqueta);
    if (!texto) continue;
    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) return fecha;
  }
  return new Date();
}

export class BuscadorRss implements BuscadorDeHallazgos {
  constructor(private readonly direcciones: Record<string, string>) {}

  async buscar(fuente: Fuente): Promise<Hallazgo[]> {
    const direccion = this.direcciones[fuente.id];
    if (!direccion) return [];

    const respuesta = await fetch(direccion, {
      headers: { 'user-agent': 'MindScrolling/0.1 (+https://github.com/Aluonam/mindscrolling)' },
    });

    if (!respuesta.ok) {
      // Una fuente caída no puede tumbar la edición entera: se avisa y se sigue.
      console.warn(`  · ${fuente.nombre} respondió ${respuesta.status}, se salta`);
      return [];
    }

    const xml = await respuesta.text();
    const bloques = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) ?? [];

    return bloques
      .map(bloque => ({
        titulo: contenidoDe(bloque, 'title'),
        resumenOriginal:
          contenidoDe(bloque, 'description') ||
          contenidoDe(bloque, 'summary') ||
          contenidoDe(bloque, 'content'),
        enlace: enlaceDe(bloque),
        publicado: fechaDe(bloque),
        fuente,
      }))
      .filter(hallazgo => hallazgo.titulo && hallazgo.enlace);
  }
}
