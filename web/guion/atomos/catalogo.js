// El catálogo de fuentes, tal como está publicado y tal como tú lo has dejado.
//
// Son dos cosas distintas y conviene no mezclarlas:
//
//   - Lo **publicado** es `config/fuentes.json` del repositorio. Es lo que lee
//     la acción de la madrugada, y por tanto lo único que decide en qué se
//     gastan los tokens.
//   - Los **cambios locales** viven en este dispositivo. Se notan al momento
//     en lo que estás leyendo, pero la acción no los ve hasta que se publican.
//
// Esa distancia es de la arquitectura, no un descuido: la aplicación es
// estática y el navegador no puede escribir en el repositorio. El panel la
// hace visible en vez de disimularla.

const CAJON = 'mindscrolling:catalogo';

const oyentes = new Set();

let publicado = null;
let cambios = leerCambios();

function leerCambios() {
  try {
    const crudo = localStorage.getItem(CAJON);
    const guardado = crudo ? JSON.parse(crudo) : {};
    return guardado && typeof guardado === 'object' ? guardado : {};
  } catch (err) {
    // Sin memoria —modo privado, permisos— el panel sigue funcionando; lo que
    // se pierde es que los cambios duren hasta la próxima visita.
    return {};
  }
}

function escribir() {
  try {
    localStorage.setItem(CAJON, JSON.stringify(cambios));
  } catch (err) { /* ídem */ }

  for (const oyente of oyentes) oyente();
}

/**
 * Se pide sin caché a propósito.
 *
 * Si acabas de publicar un cambio desde el panel, lo siguiente que quieres ver
 * es el catálogo con ese cambio dentro, no el de hace un rato.
 */
export async function cargar() {
  if (publicado) return publicado;

  const respuesta = await fetch('../config/fuentes.json', { cache: 'no-store' });
  if (!respuesta.ok) throw new Error(`El catálogo respondió ${respuesta.status}`);

  publicado = await respuesta.json();
  return publicado;
}

/** Las fuentes con los cambios locales ya aplicados encima. */
export function fuentes() {
  if (!publicado) return [];

  return publicado.fuentes.map(fuente => {
    const cambio = cambios[fuente.id];
    return cambio ? { ...fuente, ...cambio, cambiada: true } : fuente;
  });
}

export function estadoDe(id) {
  return fuentes().find(f => f.id === id)?.estado ?? null;
}

/**
 * Las que TÚ has apagado en este dispositivo, por nombre.
 *
 * Solo los cambios locales, no todo lo que el catálogo tenga sin aprobar. Si
 * mirara el catálogo entero, el lector escondería cosas distintas según
 * hubieras abierto el panel o no —porque el catálogo solo se descarga al
 * abrirlo—, y una lista que cambia sola es peor que una lista incompleta.
 *
 * Lo que ya está descartado en el repositorio no necesita esconderse: la
 * edición de mañana sencillamente no lo traerá.
 *
 * Por nombre y no por id porque es lo que llevan las piezas en el DOM.
 */
export function apagadas() {
  return new Set(
    Object.values(cambios)
      .filter(cambio => cambio.estado !== 'aprobada' && cambio.nombre)
      .map(cambio => cambio.nombre),
  );
}

/**
 * Cambiar el estado de una fuente. Se guarda solo lo que difiere de lo
 * publicado: si la devuelves a como estaba, el cambio desaparece en vez de
 * quedarse como un cambio que no cambia nada.
 */
export function cambiar(id, estado) {
  const original = publicado?.fuentes.find(f => f.id === id);
  if (!original) return;

  if (original.estado === estado) delete cambios[id];
  else cambios[id] = { estado, nombre: original.nombre };

  escribir();
}

export function hayCambios() {
  return Object.keys(cambios).length > 0;
}

export function cuantosCambios() {
  return Object.keys(cambios).length;
}

export function olvidarCambios() {
  cambios = {};
  escribir();
}

/**
 * El fichero entero, listo para pegar en el repositorio.
 *
 * Se devuelve completo y no un parche porque es lo que se puede pegar sin
 * pensar. La nota de cada fuente tocada queda como estaba: por qué se
 * descarta algo lo escribe una persona, no un panel.
 */
export function comoFichero() {
  return JSON.stringify({ ...publicado, fuentes: fuentes().map(quitarMarca) }, null, 2) + '\n';
}

function quitarMarca({ cambiada, ...fuente }) {
  return fuente;
}

/** Se llama después de publicar: lo local ya está arriba, deja de ser un cambio. */
export function darPorPublicado(nuevo) {
  publicado = nuevo;
  cambios = {};
  escribir();
}

export function alCambiar(oyente) {
  oyentes.add(oyente);
}
