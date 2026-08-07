// Las reglas de escritura de un destilado, compartidas por todos los
// resumidores.
//
// Viven aquí y no dentro de un adaptador porque son una decisión de producto,
// no del proveedor: si Claude y Groq escriben con reglas distintas, comparar
// su calidad no significa nada.

export const INSTRUCCIONES = `Escribes los resúmenes de MindScrolling, un lector donde cada pieza se lee en una pantalla de móvil.

FORMATO
- Texto plano. Sin asteriscos, sin negritas, sin Markdown, sin comillas. El lector no los interpreta y saldrían en pantalla tal cual.
- Dos o tres frases completas, entre 35 y 50 palabras en total. Una sola frase se queda corta.
- Todo en español, incluidos los términos técnicos: traduce los que vengan en otro idioma en lugar de copiarlos. Una sigla solo si dices qué es.

CÓMO EMPIEZA
La primera frase dice lo que cambia, no de qué trata el trabajo.

Mal: "Se propone AssertMate, un marco de generación de aserciones basado en agentes."
Mal: "La presencia de terapeutas ocupacionales en servicios diurnos ralentiza el declive."
Bien: "Evaluar la mano sin mirar el tronco deja fuera media explicación."
Bien: "Estamos puntuando a niños de aquí con baremos de otro país."

Nunca empieces por "Este trabajo", "Se propone", "El estudio", "La investigación".

CONTENIDO
- Frases cortas y directas. Nada de jerga innecesaria.
- No inventes datos, cifras ni conclusiones que no estén en el material.
- Si el material es insuficiente, resume solo lo que se puede afirmar.

TÉRMINOS CLAVE
Entre 2 y 3, y deben aparecer literalmente en tu texto. Son las palabras que sostienen la idea, no las siglas ni los nombres de herramientas. De "la integración sensorial predice las caídas" la clave es "integración sensorial", no "MRI".`;

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
 * Quita el Markdown que el modelo cuela aunque se le diga que no.
 *
 * El lector pinta el texto tal cual, así que un `**` no pone nada en negrita:
 * pinta dos asteriscos. Resaltar es trabajo de las claves, no del modelo.
 */
function aTextoPlano(texto: string): string {
  return texto
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Comprueba la forma de lo que devuelve el modelo, lo deja en texto plano y
 * descarta las claves que no aparecen en él.
 *
 * Una clave que no está literalmente en el texto no resalta nada: el lector la
 * busca, no la encuentra y no avisa. Mejor quitarla aquí.
 */
export function validarDestilado(bruto: unknown): { texto: string; clave: string[] } {
  const d = bruto as { texto?: unknown; clave?: unknown };

  if (typeof d?.texto !== 'string' || d.texto.trim() === '') {
    throw new Error('El destilado no trae texto.');
  }

  const texto = aTextoPlano(d.texto);
  if (texto === '') throw new Error('El destilado no trae texto.');

  const enMinusculas = texto.toLowerCase();

  const clave = (Array.isArray(d.clave) ? d.clave : [])
    .filter((c): c is string => typeof c === 'string')
    .map(c => aTextoPlano(c))
    .filter(c => c !== '' && enMinusculas.includes(c.toLowerCase()));

  return { texto, clave };
}
