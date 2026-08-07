// La barra de progreso de la cabecera.
//
// Con pocas piezas, una barra por pieza: se ve de un vistazo cuántas quedan,
// como en las historias. Con muchas no cabe —a 100 piezas los huecos solos
// ocupan más que la pantalla y cada segmento sale a ancho negativo—, así que
// se convierte en una sola barra que avanza por la edición entera.

const contenedor = document.getElementById('segmentos');

/** A partir de aquí cada segmento baja de 9 px y deja de leerse. */
const MAXIMO_SEGMENTOS = 30;

let barras = [];
let cajas = [];
let ocultas = new Set();
let total = 0;
let unaSola = false;

export function crearSegmentos(cuantos) {
  contenedor.textContent = '';
  cajas = [];
  barras = [];
  ocultas = new Set();
  total = cuantos;
  unaSola = cuantos > MAXIMO_SEGMENTOS;

  contenedor.classList.toggle('continua', unaSola);

  for (let i = 0; i < (unaSola ? 1 : cuantos); i++) {
    const caja = document.createElement('div');
    caja.className = 'segmento';
    const barra = document.createElement('i');
    caja.appendChild(barra);
    contenedor.appendChild(caja);
    cajas.push(caja);
    barras.push(barra);
  }
}

/**
 * fraccion entre 0 y 1 dentro de la pieza `indice`.
 *
 * En modo continuo el progreso es el de la edición entera: las piezas
 * anteriores cuentan como terminadas y la actual aporta su fracción.
 */
export function pintar(indice, fraccion) {
  if (!unaSola) {
    barras[indice].style.width = fraccion * 100 + '%';
    return;
  }

  const visibles = total - ocultas.size;
  if (visibles <= 0) return;

  const anteriores = contarVisiblesAntesDe(indice);
  barras[0].style.width = ((anteriores + fraccion) / visibles) * 100 + '%';
}

export function mostrar(indice, visible) {
  if (visible) ocultas.delete(indice);
  else ocultas.add(indice);

  if (!unaSola) cajas[indice].style.display = visible ? '' : 'none';
}

function contarVisiblesAntesDe(indice) {
  let n = 0;
  for (let i = 0; i < indice; i++) if (!ocultas.has(i)) n++;
  return n;
}
