// Conversiones de texto que no tocan el DOM.

/** A 200 palabras por minuto. */
export function segundosDeLectura(texto) {
  return Math.max(10, Math.round(texto.trim().split(/\s+/).length / 200 * 60));
}

/** Las primeras palabras, para el avance del índice. */
export function entradilla(texto, cuantas = 10) {
  const palabras = texto.trim().split(/\s+/);
  return palabras.slice(0, cuantas).join(' ') + (palabras.length > cuantas ? '…' : '');
}

/** De 2026-08-06 a 06/08. */
export function fechaLegible(fecha) {
  const [, mes, dia] = String(fecha).split('-');
  return dia && mes ? dia + '/' + mes : String(fecha);
}

export function tiempoLegible(segundos) {
  if (segundos < 60) return segundos + ' s';
  return Math.floor(segundos / 60) + ' min';
}
