// Quién eres, comprobado por GitHub y no por nosotras.
//
// Aquí está el motivo de que la identificación sea de GitHub y no una
// contraseña nuestra: esta aplicación es pública y su código también. Una
// contraseña escrita en el código la ve cualquiera que abra el fichero, y una
// comprobación hecha en el navegador se salta con la consola abierta. No es
// que sea difícil de proteger: es que no hay nada que proteger, porque todo lo
// que hace el navegador lo controla quien tiene el navegador.
//
// Con una credencial de GitHub, en cambio, quien decide si puedes escribir es
// el servidor de GitHub. Se puede leer el código entero, se puede trastear el
// panel entero, y sin credencial válida no se cambia una coma del catálogo.

import { credencial, guardarCredencial } from './repositorio.js';

const REPO = 'Aluonam/mindscrolling';
const API = 'https://api.github.com';

let quien = null;

export function identificada() {
  return quien !== null;
}

export function nombre() {
  return quien?.login ?? '';
}

/**
 * Comprueba la credencial y, sobre todo, que sirva PARA ESTO.
 *
 * Dos preguntas, no una: quién eres y si puedes escribir en este repositorio.
 * Una credencial válida de otra cuenta, o una de solo lectura, pasaría la
 * primera y fallaría la segunda — y es mejor saberlo al identificarse que al
 * intentar guardar un cambio.
 */
export async function identificar(token) {
  const valor = (token ?? credencial()).trim();
  if (!valor) return { bien: false, motivo: 'Pega una credencial de GitHub.' };

  const cabeceras = {
    authorization: `Bearer ${valor}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
  };

  let usuario;
  try {
    const respuesta = await fetch(`${API}/user`, { headers: cabeceras, cache: 'no-store' });
    if (respuesta.status === 401) {
      return { bien: false, motivo: 'La credencial no vale o ha caducado.' };
    }
    if (!respuesta.ok) {
      return { bien: false, motivo: `GitHub respondió ${respuesta.status} al identificarte.` };
    }
    usuario = await respuesta.json();
  } catch (err) {
    return { bien: false, motivo: 'No se ha podido hablar con GitHub. ¿Hay conexión?' };
  }

  try {
    const respuesta = await fetch(`${API}/repos/${REPO}`, { headers: cabeceras, cache: 'no-store' });
    if (!respuesta.ok) {
      return {
        bien: false,
        motivo: `Eres @${usuario.login}, pero esa credencial no da acceso a ${REPO}.`,
      };
    }

    const repo = await respuesta.json();
    if (!repo.permissions?.push) {
      return {
        bien: false,
        motivo: `Eres @${usuario.login}, pero esa credencial solo lee. Hace falta permiso de escritura.`,
      };
    }
  } catch (err) {
    return { bien: false, motivo: 'No se ha podido comprobar el permiso sobre el repositorio.' };
  }

  quien = usuario;
  guardarCredencial(valor);
  return { bien: true, motivo: `Identificada como @${usuario.login}.` };
}

export function salir() {
  quien = null;
  guardarCredencial('');
}

/** Al abrir la aplicación: si quedaba credencial guardada, se revalida. */
export async function recordar() {
  if (!credencial()) return false;
  return (await identificar()).bien;
}
