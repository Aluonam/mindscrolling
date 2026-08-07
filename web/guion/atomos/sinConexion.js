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
  navigator.serviceWorker.register('sw.js').catch(error => {
    // Sin service worker se lee igual con conexión, así que no se interrumpe
    // nada. Pero se avisa: un fallo mudo aquí es medio día buscándolo.
    console.warn('Sin lectura offline:', error.message);
  });
}
