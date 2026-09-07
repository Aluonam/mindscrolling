// Registra el service worker, que es quien guarda la edición para leerla sin
// conexión.
//
// Va aparte y no dentro de `lector.js` porque no tiene nada que ver con leer:
// si esto falla, el lector funciona igual con conexión.

export function guardarParaSinConexion() {
  if (!('serviceWorker' in navigator)) return;

  // Se registra al terminar de cargar, porque compite por la red con la
  // edición y la edición importa más.
  //
  // Pero hay que mirar si `load` ya pasó: `lector.js` espera a la edición con
  // un await de alto nivel, así que su módulo puede terminar de evaluarse
  // después del evento. Suscribirse entonces es suscribirse a algo que ya no
  // va a ocurrir — y eso dejaba la lectura sin conexión muerta en silencio.
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar, { once: true });
}

function registrar() {
  recargarAlActualizarse();

  navigator.serviceWorker.register('sw.js').catch(error => {
    // Sin service worker se lee igual con conexión, así que no se interrumpe
    // nada. Pero se avisa: un fallo mudo aquí es medio día buscándolo.
    console.warn('Sin lectura offline:', error.message);
  });
}

/**
 * Cuando llega una versión nueva, la aplicación se recarga sola. Una vez.
 *
 * Sin esto, la aplicación instalada se queda con los módulos que cargó la
 * primera vez y no se entera de nada: se publica un arreglo, el service worker
 * se actualiza por detrás, y en pantalla sigue lo de antes hasta que alguien
 * cierra la aplicación del todo. Pasó con la pestaña de fuentes recién
 * publicada, que estaba en el servidor y no aparecía en el móvil.
 *
 * «Una vez» no es un detalle: `controllerchange` también salta en el primer
 * registro, cuando no hay nada que recargar, y recargar ahí deja la aplicación
 * dando vueltas.
 */
function recargarAlActualizarse() {
  // Sin controlador es la primera visita: el cambio que venga es el registro
  // inicial, no una versión nueva.
  if (!navigator.serviceWorker.controller) return;

  let recargando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando) return;
    recargando = true;
    location.reload();
  });
}
