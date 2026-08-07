// Conversiones de texto que no tocan el DOM.

/** Las primeras palabras, para el avance del índice. */
export function entradilla(texto, cuantas = 10) {
  const palabras = texto.trim().split(/\s+/);
  return palabras.slice(0, cuantas).join(' ') + (palabras.length > cuantas ? '…' : '');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
               'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * De 2026-08-07 a «7 AGO».
 *
 * Con mes en letra y no 07/08: al lado de la posición se leía «07/08 · 6/100»
 * y las dos parecían fracciones. Una fecha no se confunde con un contador.
 */
export function fechaLegible(fecha) {
  const [, mes, dia] = String(fecha).split('-');
  if (!dia || !mes) return String(fecha);

  const nombre = MESES[Number(mes) - 1];
  return nombre ? `${Number(dia)} ${nombre}` : `${dia}/${mes}`;
}

export function tiempoLegible(segundos) {
  if (segundos < 60) return segundos + ' s';
  return Math.floor(segundos / 60) + ' min';
}
