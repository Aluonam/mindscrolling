// Barra superior: fecha de la edición, velocidad, sonido y acceso al índice.
// Las barras de progreso las monta el carril, que es quien sabe del avance.

import { estado, alCambiar } from '../estado.js';
import { fechaLegible } from '../atomos/texto.js';
import { siguiente, etiqueta } from '../moleculas/ritmo.js';

const cabecera = document.getElementById('cabecera');
const fecha    = document.getElementById('fechaEdicion');
const botonRitmo = document.getElementById('ritmo');
const contador = document.getElementById('contadorBoton');

export function montar(edicion) {
  cabecera.hidden = false;
  fecha.textContent = fechaLegible(edicion.fecha);
  botonRitmo.textContent = etiqueta();

  botonRitmo.addEventListener('click', () => {
    botonRitmo.textContent = siguiente();
  });

  // Con la barra continua no se ve cuántas quedan, así que la posición pasa a
  // la fecha: «07/08 · 12/100». Con pocas piezas los segmentos ya lo cuentan y
  // repetirlo sobra.
  const muchas = edicion.piezas.length > 30;

  alCambiar(() => {
    contador.textContent = String(estado.leidas.size);
    if (muchas) {
      fecha.textContent =
        `${fechaLegible(edicion.fecha)} · ${estado.actual + 1}/${estado.piezas.length}`;
    }
  });
}
