// El revelado palabra a palabra de una pieza.
//
// Cada pieza tiene el suyo, con su propio temporizador. Nadie de fuera toca
// el índice de la palabra actual: se pide avanzar, detener o reiniciar.

import { factor } from './ritmo.js';

/**
 * Tiempo que se sostiene una palabra antes de encender la siguiente.
 *
 * Crece con la longitud, los términos clave duran algo más, y las cinco
 * primeras entran deprisa — es el gancho (decisión 10).
 */
function duracion(nodo, posicion) {
  const base = Math.min(560, 132 + nodo.textContent.length * 26);
  const peso = nodo.classList.contains('clave') ? 1.28 : 1;
  const gancho = posicion < 5 ? 0.34 + posicion * 0.14 : 1;
  return base * peso * gancho * factor();
}

export function crearRevelado(pieza, { alProgresar, alTerminar }) {
  const nodos = Array.from(pieza.querySelectorAll('.destilado w'));

  let indice = 0;
  let temporizador = null;
  let detenida = false;
  let terminada = false;

  const progreso = () => (nodos.length ? indice / nodos.length : 1);

  function terminar() {
    terminada = true;
    alProgresar(progreso());
    alTerminar();
  }

  function avanzar() {
    if (detenida || terminada) return;

    if (indice >= nodos.length) return terminar();

    const posicion = indice;
    const nodo = nodos[posicion];
    nodo.classList.add('viva');
    indice++;
    alProgresar(progreso());

    temporizador = setTimeout(avanzar, duracion(nodo, posicion));
  }

  function parar() {
    clearTimeout(temporizador);
    temporizador = null;
  }

  return {
    avanzar,

    /** Sin animación: para «menos movimiento». */
    revelarTodo() {
      parar();
      for (const nodo of nodos) nodo.classList.add('viva');
      indice = nodos.length;
      terminar();
    },

    reiniciar() {
      parar();
      for (const nodo of nodos) nodo.classList.remove('viva');
      indice = 0;
      terminada = false;
      detenida = false;
      pieza.classList.remove('detenida');
      alProgresar(0);
    },

    detener() {
      if (detenida) return;
      detenida = true;
      parar();
      pieza.classList.add('detenida');
    },

    reanudar() {
      if (!detenida) return;
      detenida = false;
      pieza.classList.remove('detenida');
      avanzar();
    },

    parar,

    get detenida() { return detenida; },
    get terminada() { return terminada; },
  };
}
