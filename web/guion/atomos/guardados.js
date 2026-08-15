// Lo que has guardado, y dónde vive.
//
// Se guarda el enlace al original, nunca el destilado (decisión 12). Lo que hay
// aquí es una lista de trabajos ajenos que quieres volver a leer; nuestro
// resumen de diez segundos ya cumplió su función el día que salió, y mañana ya
// no está en la edición.
//
// En `localStorage` y no en IndexedDB: son unas decenas de líneas de texto, no
// un almacén. IndexedDB pide abrir, versionar y esperar a que responda, y
// tendría sentido el día que se guarden las piezas enteras para leerlas sin
// conexión. Hoy no es ese día.

const CAJON = 'mindscrolling:guardados';

const oyentes = new Set();

/**
 * El enlace es la identidad. No el índice de la pieza en el carril: el orden
 * se baraja en cada apertura, así que la posición 7 de hoy no es la de mañana.
 */
function leer() {
  try {
    const crudo = localStorage.getItem(CAJON);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista.filter(g => g && typeof g.enlace === 'string') : [];
  } catch (err) {
    // Sin memoria —modo privado, permisos— la aplicación sigue funcionando; lo
    // único que se pierde es que lo guardado dure hasta la próxima visita.
    return [];
  }
}

function escribir(lista) {
  try {
    localStorage.setItem(CAJON, JSON.stringify(lista));
  } catch (err) { /* ídem: no guardar no es motivo para romper nada */ }

  for (const oyente of oyentes) oyente();
}

/** Los últimos primero: lo que acabas de guardar es lo que buscas. */
export function listar() {
  return leer().reverse();
}

export function estaGuardado(enlace) {
  return leer().some(g => g.enlace === enlace);
}

export function quitar(enlace) {
  escribir(leer().filter(g => g.enlace !== enlace));
}

/** Guarda si no estaba, quita si estaba. Devuelve cómo queda. */
export function alternar({ enlace, titulo, fuente, ambito }) {
  if (!enlace) return false;

  if (estaGuardado(enlace)) {
    quitar(enlace);
    return false;
  }

  escribir([...leer(), { enlace, titulo, fuente, ambito }]);
  return true;
}

export function alCambiar(oyente) {
  oyentes.add(oyente);
}
