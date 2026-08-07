// Para leer la edición sin conexión, en el metro o sin datos.
//
// Dos estrategias, porque hay dos clases de fichero:
//
// - La edición cambia cada día: primero la red, y si no hay, lo guardado. Así
//   nunca se lee la de ayer teniendo la de hoy.
// - El lector no cambia entre ediciones: primero lo guardado, y se refresca de
//   fondo para la próxima vez. Abre al instante.

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

const esLaEdicion = url => url.pathname.includes('/ediciones/');

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

  evento.respondWith(
    esLaEdicion(url) ? primeroLaRed(peticion) : primeroLoGuardado(peticion),
  );
});

/** La edición del día. Si no hay red, se lee la última que se guardó. */
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

/** El lector. Responde ya con lo guardado y se actualiza para la próxima. */
async function primeroLoGuardado(peticion) {
  const cache = await caches.open(VERSION);
  const guardada = await cache.match(peticion);

  const desdeLaRed = fetch(peticion)
    .then(respuesta => {
      if (respuesta.ok) cache.put(peticion, respuesta.clone());
      return respuesta;
    })
    .catch(() => guardada);

  return guardada ?? desdeLaRed;
}
