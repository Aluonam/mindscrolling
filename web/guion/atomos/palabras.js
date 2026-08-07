// La unidad del revelado: partir un destilado en <w> y marcar las claves.

import { anclar } from './bionica.js';

const limpiar = palabra => palabra.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');

/**
 * Un término de varias palabras solo cuenta si aparecen seguidas. Marcándolas
 * por separado, «sensorial» se resaltaría en cualquier frase donde salga.
 */
function posicionesClave(palabras, terminos) {
  const normales = palabras.map(limpiar);
  const posiciones = new Set();

  for (const termino of terminos) {
    const partes = String(termino).trim().split(/\s+/).map(limpiar).filter(Boolean);
    if (partes.length === 0) continue;

    for (let i = 0; i + partes.length <= normales.length; i++) {
      if (partes.every((parte, j) => normales[i + j] === parte)) {
        for (let j = 0; j < partes.length; j++) posiciones.add(i + j);
      }
    }
  }

  return posiciones;
}

export function trocear(parrafo, destilado) {
  const palabras = destilado.texto.trim().split(/\s+/);
  const claves = posicionesClave(palabras, destilado.clave ?? []);

  palabras.forEach((palabra, i) => {
    const w = document.createElement('w');
    if (claves.has(i)) w.classList.add('clave');

    // El anclaje de la lectura biónica se marca siempre; que se vea en negrita
    // o no lo decide el CSS según el modo elegido. Así cambiar de modo no
    // obliga a repintar el destilado a media lectura.
    const { ancla, resto } = anclar(palabra);
    if (ancla) {
      const b = document.createElement('b');
      b.textContent = ancla;
      w.append(b, resto);
    } else {
      w.textContent = palabra;
    }

    parrafo.appendChild(w);
    if (i < palabras.length - 1) parrafo.appendChild(document.createTextNode(' '));
  });
}
