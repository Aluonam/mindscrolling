// El carril vertical: monta las piezas y decide cuál se está leyendo.
//
// Es el único que toca los revelados. Cuando cambia la pieza en pantalla no
// avisa a nadie en concreto: cambia el estado y lo publica.

import { estado, cambio, marcarLeida } from '../estado.js';
import { esConocido } from '../atomos/ambitos.js';
import { crearRevelado } from '../moleculas/revelado.js';
import { crearSegmentos, pintar, mostrar } from '../moleculas/segmentos.js';
import { dibujar } from './pieza.js';

const carril = document.getElementById('carril');

export const menosMovimiento =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let revelados = [];

/** Orden barajado en cada apertura (decisión 10): nunca de mejor a peor. */
function barajar(piezas) {
  const orden = [...piezas];
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

export function montar(edicion) {
  for (const dato of barajar(edicion.piezas)) carril.appendChild(dibujar(dato));

  // El final de la edición lo monta `cierre`, después de esto y como pantalla
  // propia. Aquí solo van las piezas: lo que entre en este bucle acaba en
  // `estado.piezas` y se lleva revelado, segmento y voto.
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
