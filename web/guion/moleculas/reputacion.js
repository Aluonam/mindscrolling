// Lo que has votado sobre cada fuente, y que sobrevive al cierre.
//
// Es la primera pieza del perfil aprendido (decisión 6, fase 2) y el primer
// escalón del orden que marca la decisión 9: las fuentes antes que los temas,
// porque son pocas y cada voto dice mucho de una.
//
// Vive en el dispositivo y no sale de él (decisión 5).

/**
 * localStorage y no IndexedDB, a propósito.
 *
 * La decisión 5 nombra IndexedDB, y sigue siendo lo correcto para el historial
 * de lecturas y los guardados, que crecen sin techo. Esto es otra cosa: 62
 * números que caben en medio kilobyte y que hacen falta **antes** de pintar la
 * primera pieza. localStorage es síncrono y se lee en la misma línea; IndexedDB
 * obligaría a esperar antes de montar el carril a cambio de nada.
 */
const CAJON = 'mindscrolling:reputacion';

/**
 * Cuánto mueve un voto, y hasta dónde puede llegar.
 *
 * Con 0,25 hacen falta cuatro votos en el mismo sentido para llevar una fuente
 * al extremo. No es lentitud: es que una mala tarde no entierre una fuente
 * buena, que es justo la salvaguarda que pide la decisión 9.
 */
const PASO = 0.25;
const LIMITE = 1;

/** Nombre de fuente → número entre -1 y 1. Cero es no haber opinado. */
let reputaciones = leer();

function leer() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(CAJON)) || {}));
  } catch (err) {
    // Sin permiso, en incógnito o con el cajón corrupto: se empieza de cero.
    // Perder las preferencias es molesto; no abrir el lector es peor.
    return new Map();
  }
}

function guardar() {
  try {
    localStorage.setItem(CAJON, JSON.stringify(Object.fromEntries(reputaciones)));
  } catch (err) { /* sin memoria, la sesión sigue funcionando */ }
}

export function reputacionDe(fuente) {
  return reputaciones.get(fuente) || 0;
}

/**
 * Mueve la reputación de una fuente. `pasos` es la diferencia entre el voto
 * nuevo y el anterior, no el voto: así quitar un voto deshace exactamente lo
 * que puso, y cambiar de ★ a × cuenta el doble, que es lo que ha pasado.
 */
export function ajustar(fuente, pasos) {
  if (!fuente || !pasos) return;

  const nueva = Math.max(-LIMITE, Math.min(LIMITE, reputacionDe(fuente) + pasos * PASO));

  if (nueva === 0) reputaciones.delete(fuente);
  else reputaciones.set(fuente, nueva);

  guardar();
  return nueva;
}

/** Para contarle a la lectora qué acaba de hacer su voto. */
export function comoQueda(reputacion) {
  if (reputacion > 0) return 'saldrá antes';
  if (reputacion < 0) return 'saldrá después';
  return 'vuelve a su sitio';
}

// Falta un «olvidar mis preferencias» en los ajustes. Hoy la única forma de
// volver a empezar es borrar los datos del navegador, que se lleva por delante
// también el tipo de letra. No se ha puesto aquí para no inventar la función
// antes que el botón: cuando exista la pantalla, esto son tres líneas.
