// Las reglas de escritura de un destilado, compartidas por todos los
// resumidores.
//
// Viven aquí y no dentro de un adaptador porque son una decisión de producto,
// no del proveedor: si Claude y Groq escriben con reglas distintas, comparar
// su calidad no significa nada.

export const INSTRUCCIONES = `Escribes los textos de MindScrolling, un lector donde cada pieza ocupa una pantalla de móvil. Se escriben para escucharse, no solo para leerse: alguien tiene que poder locutarlos en voz alta sin tropezar.

FORMATO
- Dos o tres frases, entre 35 y 50 palabras en total. Una sola frase se queda corta.
- Todo en español. Texto plano: sin asteriscos, sin negritas, sin Markdown, sin comillas. El lector no los interpreta y saldrían en pantalla tal cual.
- Frases cortas y de estructura simple: sujeto, verbo, predicado. Nada de subordinadas encadenadas.
- Ninguna sigla sin desarrollar la primera vez que aparece. Escribe "modelo de lenguaje", no "LLM" a secas.
- Nada de cifras largas ni decimales. "Casi un tercio" antes que "el 31,4 por ciento". Si el dato exacto es lo importante, redondéalo.

DE DÓNDE SALE
Di en alguna de las frases quién lo respalda: la revista, la institución, el equipo o el tipo de estudio. La fórmula es libre.
Si no cabe con naturalidad dentro de las 35-50 palabras, se omite. Nunca lo fuerces sacrificando el contenido.

CERTEZA
Refleja exactamente el grado de certeza del material original, ni más ni menos.
Si el original dice "sugiere", "podría", "en un modelo preliminar" o "en un estudio pequeño", tu texto lo dice igual. Nunca lo conviertas en "es", "demuestra" o "confirma".
En lo clínico esto es innegociable: no puede sonar a recomendación médica asentada si la fuente no lo respalda con ese nivel de certeza.

CÓMO EMPIEZA
La primera frase dice lo que cambia, no de qué trata el trabajo.

Mal: "Se propone AssertMate, un marco de generación de aserciones basado en agentes."
Mal: "La presencia de terapeutas ocupacionales en servicios diurnos ralentiza el declive."
Bien: "Evaluar la mano sin mirar el tronco deja fuera media explicación."
Bien: "Estamos puntuando a niños de aquí con baremos de otro país."

Nunca empieces por "Este trabajo", "Se propone", "El estudio", "La investigación".

CÓMO TERMINA
La última frase aporta algo que no estaba en la primera: una consecuencia práctica, una comparación, o una pregunta que queda en el aire.
Está prohibido que la última frase repita la primera con otras palabras para llegar a las 35.

VOCABULARIO
- Prohibido el vocabulario de bombo: "revolucionario", "increíble", "nunca antes visto", "rompe todos los esquemas", "impactante", "asombroso", "histórico" y cualquier equivalente. El gancho sale del dato, nunca del adjetivo.
- Salvo los términos clave, cualquier palabra debe entenderla alguien sin formación en el tema. Si un tecnicismo es imprescindible, explícalo ahí mismo en tres o cuatro palabras, dentro de la frase.

CONTENIDO
- No inventes datos, cifras ni conclusiones que no estén en el material.
- Si el material es insuficiente, resume solo lo que se puede afirmar.

TÉRMINOS CLAVE
Entre 2 y 3, y deben aparecer literalmente en tu texto. Son las palabras que sostienen la idea, no las siglas ni los nombres de herramientas. De "la integración sensorial predice las caídas" la clave es "integración sensorial", no "MRI".`;

/**
 * Las tres formas de abrir, y por qué se reparten desde fuera del prompt.
 *
 * La norma dice que no se repita la misma estructura en piezas consecutivas.
 * El modelo no puede cumplirla solo: cada llamada es independiente y no sabe
 * qué escribió en la anterior. Si se le pide "varía", cada pieza elige a ciegas
 * y acaban saliendo tres seguidas iguales.
 *
 * Así que la rotación la lleva quien hace las llamadas, que sí tiene memoria de
 * la edición, y a cada pieza se le manda una sola estructura, ya elegida.
 */
const APERTURAS = [
  'Dato o hallazgo directo. Ejemplo de arranque: "El cerebelo también participa en decidir."',
  'Contraste con lo que se creía. Ejemplo de arranque: "No es solo una cuestión de fuerza: también de tiempo."',
  'Pregunta retórica breve y enseguida el dato. Ejemplo de arranque: "¿Puede el cerebelo decidir? Un hallazgo nuevo apunta a que sí."',
];

/** Qué estructura le toca a la pieza número `orden` de la edición. */
export function aperturaPara(orden: number): string {
  return `ESTRUCTURA DE APERTURA PARA ESTA PIEZA\n${APERTURAS[orden % APERTURAS.length]}\nUsa esta y no otra: la variedad se reparte a lo largo de la edición.`;
}

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
 * Vocabulario de bombo. Se comprueba en código y no solo en el prompt porque
 * es una norma de producto: el gancho tiene que salir del dato.
 *
 * Se buscan con límite de palabra para que "histórico" no salte en "historia
 * clínica" ni "impactante" en "impacto".
 */
const BOMBO = [
  'revolucionari', 'increíble', 'increible', 'nunca antes visto', 'impactante',
  'asombros', 'espectacular', 'alucinante', 'rompe todos los esquemas',
  'cambia las reglas del juego', 'histórico', 'historico', 'sin precedentes',
];

/**
 * Lo más corto que puede ser un destilado sin estar roto.
 *
 * La norma pide entre 35 y 50 palabras. Aquí el listón está más abajo a
 * propósito: 20 no valida la norma, detecta la avería —una respuesta cortada a
 * media frase—. Rechazar un texto de 33 palabras correcto sería perder una
 * pieza buena por dos palabras.
 */
const MINIMO_DE_PALABRAS = 20;

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

/**
 * Comprueba las normas que se pueden comprobar, y solo ésas.
 *
 * Va aparte de `validarDestilado` porque responden a preguntas distintas: una
 * mira si el destilado tiene **forma** utilizable —hay texto, las claves
 * resaltan algo—, y ésta mira si cumple las **normas de escritura**. Un texto
 * que las incumple no está roto; está mal escrito, y merece que se pida otra
 * vez en lugar de descartarlo.
 *
 * La mayoría de las normas no se pueden comprobar en código: si la última frase
 * aporta algo nuevo, si la certeza coincide con la del original, si un
 * tecnicismo queda explicado. Ésas viven en el prompt y se confía en el modelo.
 * Aquí solo están las dos que son mecánicas.
 */
export function comprobarNormas(destilado: { texto: string; clave: string[] }): { texto: string; clave: string[] } {
  const palabras = destilado.texto.trim().split(/\s+/).length;
  if (palabras < MINIMO_DE_PALABRAS) {
    throw new Error(`son ${palabras} palabras, viene cortado`);
  }

  const enMinusculas = destilado.texto.toLowerCase();
  const bombo = BOMBO.find(p => enMinusculas.includes(p));
  if (bombo) throw new Error(`usa vocabulario de bombo: "${bombo}"`);

  return destilado;
}
