// La tira de barras de progreso de la cabecera, una por pieza.

const contenedor = document.getElementById('segmentos');

let barras = [];
let cajas = [];

export function crearSegmentos(cuantos) {
  contenedor.textContent = '';
  cajas = [];
  barras = [];

  for (let i = 0; i < cuantos; i++) {
    const caja = document.createElement('div');
    caja.className = 'segmento';
    const barra = document.createElement('i');
    caja.appendChild(barra);
    contenedor.appendChild(caja);
    cajas.push(caja);
    barras.push(barra);
  }
}

/** fraccion entre 0 y 1. */
export function pintar(indice, fraccion) {
  barras[indice].style.width = fraccion * 100 + '%';
}

export function mostrar(indice, visible) {
  cajas[indice].style.display = visible ? '' : 'none';
}
