// Quién eres, comprobado por el portero.
//
// La comprobación no puede vivir en el navegador. Esta aplicación es pública y
// su código también: una contraseña escrita aquí la leería cualquiera, y un
// `if (clave === '…')` se salta con la consola abierta. No es que sea difícil
// de proteger; es que no hay nada que proteger, porque todo lo que hace el
// navegador lo controla quien tiene el navegador.
//
// Por eso la contraseña se manda al portero y es él quien decide. Aquí solo se
// guarda la sesión que devuelve, que caduca sola y no sirve en ningún otro
// sitio.

import * as servicio from './servicio.js';

let quien = null;

export function identificada() {
  return quien !== null;
}

export function nombre() {
  return quien ?? '';
}

/** Devuelve si ha entrado y, si no, una frase que explique por qué. */
export async function identificar(usuario, clave) {
  if (!usuario || !clave) return { bien: false, motivo: 'Pon el usuario y la contraseña.' };

  try {
    quien = await servicio.entrar(usuario, clave);
    return { bien: true, motivo: `Identificada como ${quien}.` };
  } catch (error) {
    quien = null;
    return { bien: false, motivo: error.message };
  }
}

export function salir() {
  quien = null;
  servicio.olvidarSesion();
}

/**
 * Al abrir el panel: si quedaba sesión de la última vez, se da por buena.
 *
 * No se vuelve a preguntar al portero. La sesión lleva su fecha de caducidad
 * firmada dentro, así que una caducada la rechaza él en cuanto se intente algo
 * —y entonces el panel vuelve a pedir la contraseña—. Preguntar aquí sería una
 * llamada de más para enterarse un minuto antes.
 */
export function recordar() {
  if (!servicio.haySesion()) return false;
  quien = 'ti';
  return true;
}
