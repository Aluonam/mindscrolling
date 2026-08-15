// La última pantalla del carril: el reel que dice que hoy se acabó.
//
// Un feed que termina tiene que decirlo. Antes esto era una línea diminuta
// pegada al pie de la última pieza, y se leía como parte de esa pieza en vez
// de como el final de la edición.
//
// Y es el sitio donde se cuenta que la edición salió coja. El lector no puede
// saberlo por su cuenta: sesenta piezas y cien piezas se ven igual si nadie
// dice cuántas debía haber.

import { textoDeIncidencia } from '../atomos/incidencias.js';

const carril = document.getElementById('carril');

export function montar(edicion, { alVolver }) {
  const seccion = document.createElement('section');
  seccion.className = 'cierre';

  const titulo = document.createElement('b');
  titulo.textContent = 'Hasta aquí los reels de hoy';

  const nota = document.createElement('p');
  nota.textContent = 'Mañana a primera hora hay edición nueva. '
    + 'La de hoy se queda aquí por si quieres volver sobre alguna.';

  seccion.append(titulo, nota);

  const incidencia = textoDeIncidencia(edicion.incidencias);
  if (incidencia) {
    const caja = document.createElement('p');
    caja.className = 'cierre-incidencia';
    caja.textContent = incidencia;
    seccion.append(caja);
  }

  const volver = document.createElement('button');
  volver.className = 'volver';
  volver.type = 'button';
  volver.textContent = 'Volver al principio';
  volver.addEventListener('click', alVolver);
  seccion.append(volver);

  carril.appendChild(seccion);
  apagarLaBarraAlLlegar(seccion);
}

/**
 * Mientras se ve el cierre, la barra de valorar sobra: se refiere a la última
 * pieza, que ya no está en pantalla, y votarla desde aquí sería votar a ciegas.
 */
function apagarLaBarraAlLlegar(seccion) {
  const observador = new IntersectionObserver(entradas => {
    for (const entrada of entradas) {
      document.body.classList.toggle('en-cierre', entrada.intersectionRatio > 0.6);
    }
  }, { root: carril, threshold: [0.6] });

  observador.observe(seccion);
}
