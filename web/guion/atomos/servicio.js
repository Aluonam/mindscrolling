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
 * Manda la publicada en el repositorio, y la del dispositivo solo sirve
 * mientras no haya ninguna publicada. Al revés estuvo un rato y era una
 * trampa: una dirección mal pegada en el móvil se quedaba mandando para
 * siempre, y por mucho que se publicara la buena, el móvil seguía llamando a
 * la que no existía y contestando «no se ha podido hablar con el servicio».
 *
 * No es un secreto: es una dirección pública que sin la contraseña no hace
 * nada.
 */
export function direccion() {
  return DIRECCION_PUBLICADA || leer(CAJON_DIRECCION);
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

/**
 * ¿Está el portero ahí y contesta lo que debe?
 *
 * Se le hace un GET, que él rechaza con un 405 y un «Solo POST.». Esa
 * respuesta es la señal de que está vivo, que la dirección es la buena y que
 * deja hablar a esta web. Distingue los cuatro fallos que se dan en la
 * práctica, porque cada uno se arregla de una forma distinta.
 */
export async function comprobar() {
  if (!hayServicio()) {
    return { bien: false, motivo: 'No hay ninguna dirección guardada. Pégala aquí abajo.' };
  }

  let respuesta;
  try {
    respuesta = await fetch(direccion(), { method: 'GET' });
  } catch (err) {
    // El navegador no distingue entre «no existe» y «existe pero no me deja»:
    // las dos llegan aquí como un fallo de red sin más detalle.
    return {
      bien: false,
      motivo:
        'No contesta. O la dirección tiene una errata, o el despliegue no ' +
        'terminó, o Cloudflare no tiene activado workers.dev en tu cuenta. ' +
        'Ábrela en el navegador: si no sale {"error":"Solo POST."}, es una de esas tres.',
    };
  }

  const texto = await respuesta.text().catch(() => '');

  if (texto.includes('Solo POST')) {
    return { bien: true, motivo: 'El servicio responde. Ya puedes identificarte.' };
  }

  return {
    bien: false,
    motivo:
      `Contesta ${respuesta.status}, pero no es nuestro servicio. ` +
      'Comprueba que la dirección es la que dio «wrangler deploy».',
  };
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
 * Se pide a raw.githubusercontent.com y no a nuestra propia web, aunque el
 * fichero esté en las dos. El motivo es el tiempo: cuando la acción hace el
 * commit, «raw» lo sirve al instante, pero Pages tarda entre uno y tres
 * minutos en reconstruir el sitio. Leyéndolo de casa, el panel se cansaba de
 * esperar y decía que tardaba demasiado justo cuando ya estaba hecho.
 *
 * No hace falta credencial: el repositorio es público.
 */
const CRUDO = 'https://raw.githubusercontent.com/Aluonam/mindscrolling/main/config/informe.json';

export async function informe(desde) {
  let respuesta;
  try {
    respuesta = await fetch(CRUDO + '?t=' + Date.now(), { cache: 'no-store' });
  } catch (err) {
    return null;
  }

  if (!respuesta.ok) return null;

  const informe = await respuesta.json().catch(() => null);
  if (!informe) return null;
  if (desde && informe.cuando && informe.cuando <= desde) return null;

  return informe;
}
