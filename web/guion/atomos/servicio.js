// Hablar con el portero, que es quien sabe la contraseña y guarda la llave.
//
// Aquí no hay ni contraseña ni llave, y ese es todo el asunto: este fichero se
// descarga en el móvil de cualquiera que abra la aplicación. Lo único que
// viaja desde aquí es lo que tú escribes al identificarte, y lo que vuelve es
// una sesión firmada que no sirve para nada fuera de este servicio.
//
// El portero vive en `servicio/worker.js` y se monta siguiendo su README.

const CAJON_DIRECCION = 'mindscrolling:servicio';
const CAJON_SESION = 'mindscrolling:sesion';

const leer = (cajon) => {
  try {
    return localStorage.getItem(cajon) ?? '';
  } catch (err) {
    return '';
  }
};

const escribir = (cajon, valor) => {
  try {
    if (valor) localStorage.setItem(cajon, valor);
    else localStorage.removeItem(cajon);
  } catch (err) { /* sin memoria se pide cada vez, que tampoco es el fin */ }
};

/**
 * Dónde vive el portero.
 *
 * Se guarda en el dispositivo en vez de escribirla en el código porque la
 * dirección la da Cloudflare al desplegar, y hasta que no se despliega no
 * existe. No es un secreto: es una dirección pública que sin la contraseña no
 * hace nada.
 */
export function direccion() {
  return leer(CAJON_DIRECCION) || DIRECCION_PUBLICADA;
}

/** La que quede escrita en el repositorio cuando el servicio esté montado. */
let DIRECCION_PUBLICADA = '';

export async function cargarDireccion() {
  try {
    const respuesta = await fetch('../config/servicio.json', { cache: 'no-store' });
    if (respuesta.ok) DIRECCION_PUBLICADA = (await respuesta.json()).url ?? '';
  } catch (err) { /* si no está, se usa la que haya guardada en el móvil */ }
}

export function guardarDireccion(url) {
  escribir(CAJON_DIRECCION, url.trim().replace(/\/$/, ''));
}

export function hayServicio() {
  return direccion().length > 0;
}

export function sesion() {
  return leer(CAJON_SESION);
}

export function haySesion() {
  return sesion().length > 0;
}

export function olvidarSesion() {
  escribir(CAJON_SESION, '');
}

async function pedir(ruta, cuerpo) {
  if (!hayServicio()) {
    throw new Error('Falta la dirección del servicio. Se pega aquí abajo la primera vez.');
  }

  let respuesta;
  try {
    respuesta = await fetch(direccion() + ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
  } catch (err) {
    throw new Error('No se ha podido hablar con el servicio. ¿Hay conexión? ¿Es correcta la dirección?');
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    // Una sesión caducada se nota aquí y se limpia: si no, el panel seguiría
    // creyéndose dentro y fallando en cada intento sin decir por qué.
    if (respuesta.status === 401) olvidarSesion();
    throw new Error(datos.error ?? `El servicio respondió ${respuesta.status}.`);
  }

  return datos;
}

/** Identificarse. Devuelve el nombre con el que has entrado. */
export async function entrar(usuario, clave) {
  const datos = await pedir('/entrar', { usuario, clave });
  escribir(CAJON_SESION, datos.sesion);
  return datos.usuario;
}

/** Pedir que se compruebe una web. La comprobación tarda; esto solo la lanza. */
export function probarFuente({ web, nombre, ambito }) {
  return pedir('/fuente', { sesion: sesion(), web, nombre, ambito });
}

/** Guardar el catálogo con los cambios hechos en el panel. */
export function guardarCatalogo(contenido, resumen) {
  return pedir('/catalogo', { sesion: sesion(), contenido, resumen });
}

/**
 * El informe que deja la acción al terminar de mirar una web.
 *
 * Se lee del repositorio y no del servicio: es un fichero público que ya está
 * publicado, y hacerlo pasar por el portero sería dar un rodeo para nada.
 */
export async function informe(desde) {
  const respuesta = await fetch('../config/informe.json?t=' + Date.now(), { cache: 'no-store' });
  if (!respuesta.ok) return null;

  const informe = await respuesta.json();
  if (desde && informe.cuando && informe.cuando <= desde) return null;

  return informe;
}
