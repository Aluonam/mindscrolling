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

/**
 * La entrada del revelado espera 320 ms, y hay que poder cancelarla.
 *
 * Sin guardar el temporizador, bajar deprisa dejaba uno pendiente por cada
 * pieza que pasaba. Todos disparaban después, cada uno arrancaba el revelado
 * de SU pieza —parar() solo apaga el temporizador de dentro, no impide que
 * alguien lo vuelva a arrancar— y acababa habiendo varios corriendo a la vez.
 * Como cada uno pinta la barra en la posición de su índice, la barra se
 * quedaba yendo y viniendo un buen rato.
 */
let entradaPendiente = null;

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
  // `estado.piezas` y se lleva revelado, segmento y fila del índice.
  estado.piezas = Array.from(carril.querySelectorAll('.pieza'));
  crearSegmentos(estado.piezas.length);

  revelados = estado.piezas.map((pieza, i) => crearRevelado(pieza, {
    // Solo pinta quien está en pantalla. El temporizador de arriba ya evita
    // que corra nadie más, pero la barra es lo que se ve: si un revelado
    // rezagado colara un progreso, se notaría al instante.
    alProgresar: fraccion => {
      if (i === estado.actual) pintar(i, fraccion);
    },
    alTerminar: () => marcarLeida(i),
  }));

  observar();
  escucharToques();
}

/**
 * La pieza que ocupa la pantalla es la que se está leyendo.
 *
 * El navegador entrega las entradas en tandas y sin orden garantizado. Al
 * bajar deprisa, en una misma tanda hay varias piezas que han pasado del 60%
 * mientras cruzaban, y recorrerlas todas dejaba mandando a la última que
 * llegara — que podía ser una que ya se había ido por arriba. La barra
 * saltaba hacia atrás y, con la transición de 250 ms del CSS, se veía como un
 * vaivén.
 *
 * Con varias candidatas se elige mirando dónde están AHORA, no la medida que
 * el navegador tomó cuando cruzaron: entre el momento de la medida y el de
 * este aviso ha seguido habiendo desplazamiento.
 */
function observar() {
  const observador = new IntersectionObserver(entradas => {
    const candidatas = entradas.filter(e => e.isIntersecting && e.intersectionRatio > 0.6);
    if (candidatas.length === 0) return;

    const elegida = candidatas.length === 1 ? candidatas[0] : masCentrada(candidatas);
    activar(estado.piezas.indexOf(elegida.target));
  }, { root: carril, threshold: [0.6] });

  for (const pieza of estado.piezas) observador.observe(pieza);
}

/**
 * La candidata cuyo centro está más cerca del centro del carril.
 *
 * Solo se miden las candidatas de la tanda —dos o tres—, no las cien piezas:
 * leer la posición fuerza al navegador a calcular la maquetación, y hacerlo
 * cien veces en mitad de un deslizamiento se nota.
 */
function masCentrada(candidatas) {
  const caja = carril.getBoundingClientRect();
  const centro = caja.top + caja.height / 2;

  let mejor = candidatas[0];
  let menor = Infinity;

  for (const candidata of candidatas) {
    const suya = candidata.target.getBoundingClientRect();
    const distancia = Math.abs(suya.top + suya.height / 2 - centro);
    if (distancia < menor) {
      menor = distancia;
      mejor = candidata;
    }
  }

  return mejor;
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

  // Se cancela la entrada pendiente de la pieza anterior antes que nada: si
  // llegara a dispararse, arrancaría un revelado que ya no está en pantalla.
  clearTimeout(entradaPendiente);
  entradaPendiente = null;

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
  else entradaPendiente = setTimeout(() => revelado.avanzar(), 320);

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

  // Por el mismo temporizador que la entrada de cualquier otra pieza: si se
  // desliza antes de que pasen los 500 ms, «activar» lo cancela y la primera
  // no se pone a revelarse por detrás de la que ya está en pantalla.
  if (menosMovimiento) primero.revelarTodo();
  else entradaPendiente = setTimeout(() => primero.avanzar(), 500);

  cambio();
}
