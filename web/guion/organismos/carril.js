// El carril vertical: monta las piezas y decide cuál se está leyendo.
//
// Es el único que toca los revelados. Cuando cambia la pieza en pantalla no
// avisa a nadie en concreto: cambia el estado y lo publica.

import { estado, cambio, marcarLeida } from '../estado.js';
import { esConocido } from '../atomos/ambitos.js';
import { reputacionDe } from '../moleculas/reputacion.js';
import { crearRevelado } from '../moleculas/revelado.js';
import { crearSegmentos, pintar, mostrar } from '../moleculas/segmentos.js';
import { dibujar } from './pieza.js';

const carril = document.getElementById('carril');

export const menosMovimiento =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let revelados = [];

/**
 * Cuánto puede empujar la reputación de una fuente dentro del azar.
 *
 * Cada pieza recibe una clave aleatoria entre 0 y 1, y la reputación la
 * desplaza como mucho medio punto. Eso deja los tres rangos solapados a
 * propósito:
 *
 *     fuente odiada  (-1) → clave entre -0,5 y 0,5
 *     fuente neutra   (0) → clave entre  0   y 1
 *     fuente querida (+1) → clave entre  0,5 y 1,5
 *
 * Una fuente que has votado mal cuatro veces sale abajo casi siempre, pero no
 * siempre: de vez en cuando le toca clave alta y vuelve a asomar. No es un
 * descuido, es la reserva para explorar de la decisión 8 — sin ella el feed se
 * cierra sobre lo que ya te gusta y en dos meses no enseña nada nuevo. Y una
 * fuente enterrada nunca podría demostrar que ha mejorado.
 *
 * Medido sobre 100.000 tiradas: una fuente en el suelo le gana a una neutra el
 * **12,5%** de las veces. La decisión 8 pide entre el 10% y el 15%, así que el
 * medio punto no es un número redondo elegido a ojo — es el que cae dentro.
 * Si algún día se toca, hay que volver a medirlo.
 */
const FUERZA = 0.5;

/**
 * Orden barajado en cada apertura (decisión 10): nunca de mejor a peor.
 *
 * El azar manda, y la reputación solo lo inclina. Barajar sigue siendo lo
 * primero que pasa aquí.
 */
function barajar(piezas) {
  return [...piezas]
    .map(dato => ({
      dato,
      clave: Math.random() + reputacionDe(dato.fuente.nombre) * FUERZA,
    }))
    .sort((a, b) => b.clave - a.clave)
    .map(par => par.dato);
}

export function montar(edicion) {
  for (const dato of barajar(edicion.piezas)) carril.appendChild(dibujar(dato));

  const cierre = document.createElement('div');
  cierre.className = 'arranque';
  cierre.textContent = 'Fin de la edición · vuelve mañana';
  carril.lastElementChild.appendChild(cierre);

  estado.piezas = Array.from(carril.querySelectorAll('.pieza'));
  crearSegmentos(estado.piezas.length);

  revelados = estado.piezas.map((pieza, i) => crearRevelado(pieza, {
    alProgresar: fraccion => pintar(i, fraccion),
    alTerminar: () => marcarLeida(i),
  }));

  observar();
  escucharToques();
}

/** La pieza que ocupa la pantalla es la que se está leyendo. */
function observar() {
  const observador = new IntersectionObserver(entradas => {
    for (const entrada of entradas) {
      if (entrada.isIntersecting && entrada.intersectionRatio > 0.6) {
        activar(estado.piezas.indexOf(entrada.target));
      }
    }
  }, { root: carril, threshold: [0.6] });

  for (const pieza of estado.piezas) observador.observe(pieza);
}

/** Tocar: pausa o reanuda. Si ya terminó, reinicia. */
function escucharToques() {
  estado.piezas.forEach((pieza, i) => {
    pieza.addEventListener('click', ev => {
      if (ev.target.closest('a')) return;
      const revelado = revelados[i];

      if (revelado.terminada) {
        revelado.reiniciar();
        revelado.avanzar();
        return;
      }

      if (revelado.detenida) revelado.reanudar();
      else revelado.detener();
    });
  });
}

export function activar(indice) {
  if (indice === estado.actual) return;
  revelados[estado.actual].parar();
  estado.actual = indice;

  // Cabecera y botones toman el color del ámbito activo.
  const ambito = estado.piezas[indice].dataset.ambito;
  document.documentElement.style.setProperty(
    '--acento', 'var(--' + (esConocido(ambito) ? ambito : 'tecnico') + ')',
  );

  const revelado = revelados[indice];
  revelado.reiniciar();
  if (menosMovimiento) revelado.revelarTodo();
  else setTimeout(() => revelado.avanzar(), 320);

  cambio();
}

/** Lo usa la ampliación: mientras se lee el original, el destilado espera. */
export function detenerActual() {
  revelados[estado.actual].detener();
}

export function reanudarActual() {
  revelados[estado.actual].reanudar();
}

export function mostrarPieza(indice, visible) {
  estado.piezas[indice].style.display = visible ? '' : 'none';
  mostrar(indice, visible);
}

export function estaVisible(indice) {
  return estado.piezas[indice].style.display !== 'none';
}

export function irA(indice) {
  estado.piezas[indice].scrollIntoView({
    behavior: menosMovimiento ? 'auto' : 'smooth',
  });
}

export function arrancar() {
  const primero = revelados[0];
  const ambito = estado.piezas[0].dataset.ambito;
  document.documentElement.style.setProperty(
    '--acento', 'var(--' + (esConocido(ambito) ? ambito : 'tecnico') + ')',
  );

  if (menosMovimiento) primero.revelarTodo();
  else setTimeout(() => primero.avanzar(), 500);

  cambio();
}
