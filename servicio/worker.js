// El portero: comprueba la contraseña y guarda la llave de GitHub.
//
// Existe por un motivo concreto. El lector es una web estática y su código se
// descarga entero en el móvil de quien la abre, así que cualquier cosa que
// esté ahí dentro es pública: una contraseña se lee, y una llave de GitHub
// también. Sin este servicio, o la contraseña funciona en un solo dispositivo
// —porque la llave se pega a mano— o el repositorio queda abierto a cualquiera.
//
// Aquí, en cambio, la contraseña viaja y la llave no: la llave vive en los
// secretos de Cloudflare y solo la usa este código, en el servidor.
//
// Se despliega con `npx wrangler deploy` desde esta carpeta. Hacen falta dos
// secretos, y se ponen una vez con `npx wrangler secret put NOMBRE`:
//
//   CLAVE          la contraseña
//   GITHUB_TOKEN   el token de GitHub con permiso de Contenido y Flujos
//
// Ninguno de los dos está en este fichero, y por eso este fichero puede estar
// en un repositorio público sin que pase nada.
//
// El usuario es «pau» salvo que se ponga otro en el secreto USUARIO, y la
// firma de las sesiones se saca de la propia contraseña. Empezaron siendo
// secretos aparte y era pedir cuatro cosas para configurar dos.

const REPO = 'Aluonam/mindscrolling';
const FICHERO = 'config/fuentes.json';
const GITHUB = 'https://api.github.com';

/** Lo que dura una sesión antes de volver a pedir la contraseña. */
const HORAS_DE_SESION = 12;

/** Con una sola persona usando esto, el usuario no merece un secreto propio. */
const USUARIO_POR_DEFECTO = 'pau';

/**
 * De qué se firman las sesiones.
 *
 * Sale de la contraseña, que ya es un secreto y ya está puesta. Tiene un
 * efecto secundario que viene bien: cambiar la contraseña tira todas las
 * sesiones abiertas, que es justo lo que se quiere al cambiarla.
 */
const secretoDeFirma = entorno => 'mindscrolling.' + (entorno.CLAVE ?? '');

/**
 * Quién puede llamar a este servicio.
 *
 * Sin esta lista, cualquier web podría montar un formulario contra este
 * servicio y probar contraseñas desde el navegador de quien la visite.
 */
const PERMITIDOS = [
  'https://aluonam.github.io',
  'http://localhost:8731',
];

export default {
  async fetch(peticion, entorno) {
    const origen = peticion.headers.get('origin') ?? '';
    const cabeceras = cabecerasDeCors(origen);

    if (peticion.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras });
    if (peticion.method !== 'POST') return contestar({ error: 'Solo POST.' }, 405, cabeceras);

    const ruta = new URL(peticion.url).pathname;

    try {
      if (ruta === '/entrar') return await entrar(peticion, entorno, cabeceras);
      if (ruta === '/fuente') return await probarFuente(peticion, entorno, cabeceras);
      if (ruta === '/catalogo') return await guardarCatalogo(peticion, entorno, cabeceras);
      return contestar({ error: 'Aquí no hay nada.' }, 404, cabeceras);
    } catch (error) {
      return contestar({ error: error.message }, 500, cabeceras);
    }
  },
};

function cabecerasDeCors(origen) {
  return {
    'access-control-allow-origin': PERMITIDOS.includes(origen) ? origen : PERMITIDOS[0],
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'content-type': 'application/json; charset=utf-8',
  };
}

const contestar = (cuerpo, estado, cabeceras) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras });

// ---------------------------------------------------------------------------
// Identificarse
// ---------------------------------------------------------------------------

async function entrar(peticion, entorno, cabeceras) {
  const { usuario, clave } = await peticion.json();

  // Se comparan las dos aunque falle la primera, y se tarda lo mismo acierte o
  // no: si contestara antes con el usuario mal, se podría averiguar cuál es el
  // usuario bueno midiendo el tiempo.
  const bienUsuario = igual(String(usuario ?? ''), entorno.USUARIO || USUARIO_POR_DEFECTO);
  const bienClave = igual(String(clave ?? ''), entorno.CLAVE ?? '');

  if (!entorno.CLAVE) {
    return contestar(
      { error: 'El servicio está desplegado pero sin contraseña: falta «npx wrangler secret put CLAVE».' },
      503,
      cabeceras,
    );
  }

  if (!bienUsuario || !bienClave) {
    return contestar({ error: 'El usuario o la contraseña no son correctos.' }, 401, cabeceras);
  }

  return contestar(
    { sesion: await firmar(entorno), usuario: entorno.USUARIO || USUARIO_POR_DEFECTO },
    200,
    cabeceras,
  );
}

/**
 * Comparación que tarda lo mismo aunque falle a la primera letra.
 *
 * Con un `===` normal se puede adivinar una contraseña letra a letra midiendo
 * cuánto tarda en contestar. Aquí se recorre entera siempre.
 */
function igual(uno, otro = '') {
  if (uno.length !== otro.length) return false;

  let diferencia = 0;
  for (let i = 0; i < uno.length; i++) diferencia |= uno.charCodeAt(i) ^ otro.charCodeAt(i);
  return diferencia === 0;
}

/**
 * Una sesión es «hasta cuándo vale», firmado.
 *
 * No se guarda nada: el servicio no tiene memoria entre peticiones. La firma
 * es lo que impide que alguien se invente una sesión, porque para firmarla
 * haría falta el secreto, que no sale de aquí.
 */
async function firmar(entorno) {
  const caduca = Date.now() + HORAS_DE_SESION * 3600_000;
  return `${caduca}.${await hmac(String(caduca), secretoDeFirma(entorno))}`;
}

async function comprobarSesion(sesion, entorno) {
  const [caduca, firma] = String(sesion ?? '').split('.');
  if (!caduca || !firma) return false;
  if (Number(caduca) < Date.now()) return false;

  return igual(firma, await hmac(caduca, secretoDeFirma(entorno)));
}

async function hmac(texto, secreto) {
  const llave = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const firma = await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(texto));
  return [...new Uint8Array(firma)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Lo que se puede hacer estando dentro
// ---------------------------------------------------------------------------

async function conSesion(peticion, entorno, cabeceras, hacer) {
  const cuerpo = await peticion.json();

  if (!(await comprobarSesion(cuerpo.sesion, entorno))) {
    return contestar({ error: 'La sesión ha caducado. Vuelve a identificarte.' }, 401, cabeceras);
  }

  return hacer(cuerpo);
}

const cabecerasDeGithub = entorno => ({
  authorization: `Bearer ${entorno.GITHUB_TOKEN}`,
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  'user-agent': 'MindScrolling-Panel',
  'content-type': 'application/json',
});

/** Lanza la acción que mira si una web sirve como fuente. */
function probarFuente(peticion, entorno, cabeceras) {
  return conSesion(peticion, entorno, cabeceras, async ({ web, nombre, ambito }) => {
    if (!web) return contestar({ error: 'Falta la dirección de la web.' }, 400, cabeceras);

    const respuesta = await fetch(
      `${GITHUB}/repos/${REPO}/actions/workflows/probar-fuente.yml/dispatches`,
      {
        method: 'POST',
        headers: cabecerasDeGithub(entorno),
        body: JSON.stringify({
          ref: 'main',
          inputs: { web: String(web), nombre: String(nombre ?? ''), ambito: String(ambito ?? 'tecnico') },
        }),
      },
    );

    if (!respuesta.ok) {
      return contestar(
        { error: `GitHub respondió ${respuesta.status} al lanzar la comprobación.` },
        502,
        cabeceras,
      );
    }

    return contestar({ lanzada: true }, 200, cabeceras);
  });
}

/** Guarda el catálogo entero, con los encendidos y apagados que hayas hecho. */
function guardarCatalogo(peticion, entorno, cabeceras) {
  return conSesion(peticion, entorno, cabeceras, async ({ contenido, resumen }) => {
    if (typeof contenido !== 'string' || !contenido.trim()) {
      return contestar({ error: 'Falta el catálogo.' }, 400, cabeceras);
    }

    // Que sea JSON válido se comprueba aquí y no allí: un fichero roto dejaría
    // la edición de mañana sin catálogo que leer.
    try {
      JSON.parse(contenido);
    } catch {
      return contestar({ error: 'El catálogo no es JSON válido; no se guarda.' }, 400, cabeceras);
    }

    const actual = await fetch(`${GITHUB}/repos/${REPO}/contents/${FICHERO}`, {
      headers: cabecerasDeGithub(entorno),
    });

    if (!actual.ok) {
      return contestar({ error: `No se ha podido leer el catálogo (${actual.status}).` }, 502, cabeceras);
    }

    const respuesta = await fetch(`${GITHUB}/repos/${REPO}/contents/${FICHERO}`, {
      method: 'PUT',
      headers: cabecerasDeGithub(entorno),
      body: JSON.stringify({
        message: String(resumen ?? 'Catálogo actualizado desde el panel').slice(0, 72),
        content: aBase64(contenido),
        sha: (await actual.json()).sha,
      }),
    });

    if (!respuesta.ok) {
      return contestar({ error: `GitHub respondió ${respuesta.status} al guardar.` }, 502, cabeceras);
    }

    return contestar({ guardado: true }, 200, cabeceras);
  });
}

function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario);
}
