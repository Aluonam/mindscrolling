// Panel lateral: la edición del día, lo guardado, el filtro y el marcador.

import { estado, alCambiar } from '../estado.js';
import { nombreDe } from '../atomos/ambitos.js';
import { tiempoLegible } from '../atomos/texto.js';
import { crearFila, pintarFila } from '../moleculas/fila.js';
import { crearGuardado } from '../moleculas/guardado.js';
import * as guardados from '../atomos/guardados.js';
import * as velo from '../moleculas/velo.js';
import { mostrarPieza, estaVisible, irA } from './carril.js';

const panel      = document.getElementById('indice');
const listado    = document.getElementById('listado');
const filtros    = document.getElementById('filtros');
const pestanas   = document.getElementById('pestanas');
const cajaGuardados = document.getElementById('guardados');
const contadorGuardados = document.getElementById('contadorGuardados');
const pestanaEdicion = document.getElementById('pestanaEdicion');
const pestanaGuardados = document.getElementById('pestanaGuardados');
const resumenUso = document.getElementById('resumenUso');
const botonAbrir = document.getElementById('abrirIndice');
const botonCerrar = document.getElementById('cerrarIndice');

let segundosUso = 0;
let filtro = 'todo';
let viendo = 'edicion';

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
  }));
}

/**
 * Lo guardado. Son enlaces al original, no piezas: la edición de hoy se va
 * mañana y esto se queda, así que aquí no hay destilado que enseñar.
 */
function pintarGuardados() {
  const lista = guardados.listar();
  contadorGuardados.textContent = String(lista.length);
  cajaGuardados.textContent = '';

  if (lista.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'guardados-vacio';
    vacio.textContent = 'Todavía no has guardado nada. El marcador de la esquina '
      + 'guarda aquí el enlace al trabajo original, y se queda aunque la edición cambie.';
    cajaGuardados.appendChild(vacio);
    return;
  }

  for (const guardado of lista) {
    cajaGuardados.appendChild(
      crearGuardado(guardado, () => { guardados.quitar(guardado.enlace); }),
    );
  }
}

/** Una cosa u otra: el panel no es tan ancho como para las dos a la vez. */
function ver(cual) {
  viendo = cual;
  const enEdicion = cual === 'edicion';

  filtros.hidden = !enEdicion;
  listado.hidden = !enEdicion;
  cajaGuardados.hidden = enEdicion;

  pestanaEdicion.classList.toggle('activa', enEdicion);
  pestanaGuardados.classList.toggle('activa', !enEdicion);
  pestanaEdicion.setAttribute('aria-pressed', String(enEdicion));
  pestanaGuardados.setAttribute('aria-pressed', String(!enEdicion));
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

  pestanaEdicion.addEventListener('click', () => ver('edicion'));
  pestanaGuardados.addEventListener('click', () => ver('guardados'));
  ver('edicion');

  // Se repinta desde aquí y no desde quien guarda: el botón de la barra no
  // sabe que este panel existe, ni tiene por qué.
  guardados.alCambiar(pintarGuardados);
  pintarGuardados();

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
