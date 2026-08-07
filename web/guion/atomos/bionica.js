// Lectura biónica: la primera parte de cada palabra en negrita.
//
// La idea es que el ojo salte de anclaje en anclaje y no lea letra a letra.
// Conviene saber que la evidencia no la respalda: los estudios controlados no
// encuentran mejoras claras de velocidad ni de comprensión. Está aquí como
// preferencia, no como recomendación clínica.
//
// El marcado se genera siempre; que se vea o no lo decide el CSS. Así cambiar
// de modo no obliga a repintar el destilado a media lectura.

/**
 * Cuántas letras se anclan.
 *
 * Las palabras cortas necesitan menos: marcar tres de cuatro letras no deja
 * anclaje, deja la palabra entera en negrita.
 */
function letrasAncladas(palabra) {
  const n = palabra.length;
  if (n <= 1) return n;
  if (n <= 3) return 1;
  if (n <= 6) return 2;
  return Math.round(n * 0.4);
}

/**
 * Reparte una palabra en su parte anclada y el resto.
 *
 * La puntuación pegada no cuenta como letra: en «sensorial.» el punto no debe
 * comerse una posición del anclaje.
 */
export function anclar(palabra) {
  const soloLetras = palabra.replace(/[^\p{L}\p{N}]/gu, '');
  if (soloLetras === '') return { ancla: '', resto: palabra };

  const cuantas = letrasAncladas(soloLetras);

  let vistas = 0;
  let corte = 0;
  for (const letra of palabra) {
    corte += letra.length;
    if (/[\p{L}\p{N}]/u.test(letra)) vistas++;
    if (vistas >= cuantas) break;
  }

  return { ancla: palabra.slice(0, corte), resto: palabra.slice(corte) };
}
