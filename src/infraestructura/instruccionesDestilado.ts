// Las reglas de escritura de un destilado, compartidas por todos los
// resumidores.
//
// Viven aquí y no dentro de un adaptador porque son una decisión de producto,
// no del proveedor: si Claude y Groq escriben con reglas distintas, comparar
// su calidad no significa nada.

export const INSTRUCCIONES = `Escribes los resúmenes de MindScrolling, un lector donde cada pieza se lee en una pantalla de móvil.

Reglas:
- Español, entre 35 y 50 palabras. Ni una más.
- Empieza por lo sorprendente o lo que cambia algo. Nunca por el contexto ni por "este artículo trata de".
- Frases cortas y directas. Nada de jerga innecesaria.
- No inventes datos, cifras ni conclusiones que no estén en el material.
- Si el material es insuficiente, resume solo lo que se puede afirmar.

Marca además entre 2 y 3 términos clave: los que, resaltados, permiten captar la idea sin leerlo todo. Deben aparecer literalmente en tu texto.`;

/** Lo que se le manda de cada pieza. El resumen original se recorta: pasado
 *  cierto punto no añade nada y solo encarece la llamada. */
export function materialDe(pieza: {
  fuente: { nombre: string };
  titulo: string;
  resumenOriginal: string;
}): string {
  return [
    `Fuente: ${pieza.fuente.nombre}`,
    `Título: ${pieza.titulo}`,
    '',
    pieza.resumenOriginal.slice(0, 4000),
  ].join('\n');
}

/**
 * Comprueba la forma de lo que devuelve el modelo y descarta las claves que no
 * aparecen en el texto.
 *
 * Una clave que no está literalmente en el texto no resalta nada: el lector la
 * busca, no la encuentra y no avisa. Mejor quitarla aquí.
 */
export function validarDestilado(bruto: unknown): { texto: string; clave: string[] } {
  const d = bruto as { texto?: unknown; clave?: unknown };

  if (typeof d?.texto !== 'string' || d.texto.trim() === '') {
    throw new Error('El destilado no trae texto.');
  }

  const texto = d.texto.trim();
  const enMinusculas = texto.toLowerCase();

  const clave = (Array.isArray(d.clave) ? d.clave : [])
    .filter((c): c is string => typeof c === 'string')
    .map(c => c.trim())
    .filter(c => c !== '' && enMinusculas.includes(c.toLowerCase()));

  return { texto, clave };
}
