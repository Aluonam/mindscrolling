// Panel lateral: la edición del día, el filtro por ámbito y el marcador.

import { estado, alCambiar } from '../estado.js';
import { nombreDe } from '../atomos/ambitos.js';
import { tiempoLegible } from '../atomos/texto.js';
import { crearFila, pintarFila } from '../moleculas/fila.js';
import * as velo from '../moleculas/velo.js';
import { mostrarPieza, estaVisible, irA } from './carril.js';

const panel      = document.getElementById('indice');
const listado    = document.getElementById('listado');
const filtros    = document.getElementById('filtros');
const resumenUso = document.getElementById('resumenUso');
const botonAbrir = document.getElementById('abrirIndice');
const botonCerrar = document.getElementById('cerrarIndice');

let segundosUso = 0;
let filtro = 'todo';

export function estaAbierto() {
  return panel.classList.contains('abierto');
}

export function abrir() {
  panel.classList.add('abierto');
  panel.setAttribute('aria-hidden', 'false');
  botonAbrir.setAttribute('aria-expanded', 'true');
  velo.abrir('indice');
  pintar();
  botonCerrar.focus();
}

export function cerrar() {
  panel.classList.remove('abierto');
  panel.setAttribute('aria-hidden', 'true');
  botonAbrir.setAttribute('aria-expanded', 'false');
  velo.cerrar('indice');
}

function pintar() {
  resumenUso.textContent =
    tiempoLegible(segundosUso) + ' de uso · ' +
    estado.leidas.size + ' de ' + estado.piezas.length + ' leídas';

  Array.from(listado.children).forEach((fila, i) => pintarFila(fila, {
    actual: i === estado.actual,
    leida: estado.leidas.has(i),
    voto: estado.votos.get(i),
  }));
}

function construirListado() {
  listado.textContent = '';
  estado.piezas.forEach((pieza, i) => {
    listado.appendChild(crearFila(pieza, () => { cerrar(); irA(i); }));
  });
}

/** Los chips salen de la edición: un ámbito sin piezas hoy no aparece. */
function construirFiltros() {
  const presentes = [...new Set(estado.piezas.map(p => p.dataset.ambito))];
  const opciones = [{ id: 'todo', nombre: 'Todo' }]
    .concat(presentes.map(id => ({ id, nombre: nombreDe(id) })));

  for (const opcion of opciones) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.id = opcion.id;
    chip.textContent = opcion.nombre;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => aplicarFiltro(opcion.id));
    filtros.appendChild(chip);
  }
}

function aplicarFiltro(nuevo) {
  filtro = nuevo;

  estado.piezas.forEach((pieza, i) => {
    const visible = filtro === 'todo' || pieza.dataset.ambito === filtro;
    mostrarPieza(i, visible);
    listado.children[i].style.display = visible ? '' : 'none';
  });

  for (const chip of filtros.children) {
    chip.classList.toggle('activa', chip.dataset.id === filtro);
    chip.setAttribute('aria-pressed', String(chip.dataset.id === filtro));
  }

  // Si la pieza actual queda fuera del filtro, salta a la primera visible.
  if (!estaVisible(estado.actual)) {
    const primera = estado.piezas.findIndex((_, i) => estaVisible(i));
    if (primera !== -1) {
      estado.piezas[primera].scrollIntoView({ behavior: 'auto' });
    }
  }
}

export function montar() {
  construirListado();
  construirFiltros();
  aplicarFiltro('todo');

  botonAbrir.addEventListener('click', abrir);
  botonCerrar.addEventListener('click', cerrar);
  alCambiar(pintar);

  // Solo cuenta con la pestaña visible.
  setInterval(() => {
    if (document.hidden) return;
    segundosUso++;
    if (estaAbierto()) pintar();
  }, 1000);

  pintar();
}
