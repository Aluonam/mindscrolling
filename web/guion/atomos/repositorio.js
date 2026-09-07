// Publicar el catálogo en GitHub desde el propio móvil.
//
// Es opcional. Sin credencial el panel sigue sirviendo: enseña el fichero y lo
// copias. Con credencial se ahorra el viaje al ordenador, que es justo lo que
// no apetece hacer cuando ves algo que no encaja mientras lees en el sofá.
//
// LA CREDENCIAL NO SALE DE ESTE DISPOSITIVO. Se guarda en `localStorage` y
// solo viaja a api.github.com. Como esta aplicación es pública, es lo único
// que separa a quien puede cambiar el catálogo de quien no: el panel se ve,
// pero sin credencial no escribe nada.
//
// Conviene que sea un token de acceso preciso —«fine-grained»— limitado a este
// repositorio y con permiso de Contenido: lectura y escritura. Nada más. Así,
// si el móvil se pierde, lo que está en juego es editar un repositorio público
// que ya se puede leer entero, y se revoca desde la web de GitHub.

const CAJON = 'mindscrolling:credencial';

const REPO = 'Aluonam/mindscrolling';
const FICHERO = 'config/fuentes.json';
const API = 'https://api.github.com';

export function credencial() {
  try {
    return localStorage.getItem(CAJON) ?? '';
  } catch (err) {
    return '';
  }
}

export function guardarCredencial(valor) {
  try {
    if (valor) localStorage.setItem(CAJON, valor.trim());
    else localStorage.removeItem(CAJON);
  } catch (err) { /* sin memoria, se pide cada vez */ }
}

export function hayCredencial() {
  return credencial().length > 0;
}

function cabeceras() {
  return {
    authorization: `Bearer ${credencial()}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  };
}

/**
 * GitHub pide el sha de la versión que se está sustituyendo.
 *
 * No es burocracia: es lo que impide pisar un cambio que haya entrado por otro
 * lado mientras tú tenías el panel abierto. Si no cuadra, la API contesta 409 y
 * el panel lo cuenta en vez de sobrescribir a ciegas.
 */
async function shaActual() {
  const respuesta = await fetch(`${API}/repos/${REPO}/contents/${FICHERO}`, {
    headers: cabeceras(),
    cache: 'no-store',
  });

  if (!respuesta.ok) throw new Error(explicar(respuesta.status, 'leer el catálogo'));
  return (await respuesta.json()).sha;
}

/** Base64 de un texto con acentos: btoa solo entiende bytes. */
function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}

export async function publicar(contenido, resumen) {
  const respuesta = await fetch(`${API}/repos/${REPO}/contents/${FICHERO}`, {
    method: 'PUT',
    headers: { ...cabeceras(), 'content-type': 'application/json' },
    body: JSON.stringify({
      message: resumen,
      content: aBase64(contenido),
      sha: await shaActual(),
    }),
  });

  if (!respuesta.ok) throw new Error(explicar(respuesta.status, 'publicar'));
  return respuesta.json();
}

/** Los números de la API, en palabras que digan qué hacer. */
function explicar(codigo, quehacia) {
  if (codigo === 401) return 'La credencial no vale o ha caducado. Se cambia abajo.';
  if (codigo === 403) return 'La credencial no tiene permiso de escritura sobre este repositorio.';
  if (codigo === 404) return 'No se encuentra el repositorio. ¿La credencial da acceso a este?';
  if (codigo === 409) return 'Alguien ha cambiado el catálogo mientras tanto. Recarga y vuelve a intentarlo.';
  return `GitHub respondió ${codigo} al ${quehacia}.`;
}
