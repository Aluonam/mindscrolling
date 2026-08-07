// Para leer la edición sin conexión, en el metro o sin datos.
//
// Una sola estrategia para todo: primero la red, y lo guardado como respaldo.
//
// Antes el lector iba «primero lo guardado» para abrir al instante, y se
// refrescaba de fondo. Abría más rápido, sí, pero servía la versión anterior:
// cada arreglo publicado se veía una visita tarde, y con mala suerte se juntaba
// un lector viejo con una edición nueva. Cuesta unos milisegundos y se ve
// siempre lo último; sin conexión no cambia nada.

const VERSION = 'mindscrolling-v1';

// Solo lo imprescindible para arrancar. El resto —las 23 hojas y los módulos
// del guion— se guarda al vuelo la primera vez que se piden.
//
// Se hace así a propósito: una lista con los 40 ficheros se quedaría vieja el
// día que alguien añada una molécula, y fallaría en silencio justo sin
// conexión, que es cuando no puedes depurarlo.
const IMPRESCINDIBLE = [
  './',
  './index.html',
  './manifest.json',
  './iconos/icono-192.png',
  './iconos/icono-512.png',
];

self.addEventListener('install', evento => {
  evento.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(IMPRESCINDIBLE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nombres => Promise.all(
        nombres.filter(n => n !== VERSION).map(n => caches.delete(n)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', evento => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  // Lo de fuera —el enlace al original— no se toca.
  if (url.origin !== self.location.origin) return;

  evento.respondWith(primeroLaRed(peticion));
});

/** Lo último que haya. Sin red, lo que se guardó la última vez. */
async function primeroLaRed(peticion) {
  const cache = await caches.open(VERSION);
  try {
    const respuesta = await fetch(peticion, { cache: 'no-store' });
    if (respuesta.ok) cache.put(peticion, respuesta.clone());
    return respuesta;
  } catch {
    const guardada = await cache.match(peticion);
    if (guardada) return guardada;
    throw new Error('Sin conexión y sin edición guardada.');
  }
}
