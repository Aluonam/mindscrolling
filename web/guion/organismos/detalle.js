// Ampliación: título y resumen del autor (decisión 17).

import { estado } from '../estado.js';
import * as velo from '../moleculas/velo.js';
import { detenerActual, reanudarActual } from './carril.js';

const panel  = document.getElementById('detalle');
const fuente = document.getElementById('detalleFuente');
const titulo = document.getElementById('detalleTitulo');
const texto  = document.getElementById('detalleTexto');
const enlace = document.getElementById('detalleEnlace');
const cuerpo = document.getElementById('detalleCuerpo');
const botonCerrar = document.getElementById('cerrarDetalle');

export function estaAbierto() {
  return panel.classList.contains('abierto');
}

export function abrir() {
  const pieza = estado.piezas[estado.actual];
  fuente.textContent = pieza.dataset.fuente;
  titulo.textContent = pieza.dataset.titulo || '';
  texto.textContent  = pieza.dataset.amplia || '';
  enlace.href = pieza.dataset.enlace || '#';
  cuerpo.scrollTop = 0;

  panel.classList.add('abierto');
  panel.setAttribute('aria-hidden', 'false');
  velo.abrir('detalle');

  detenerActual();
  botonCerrar.focus();
}

export function cerrar() {
  panel.classList.remove('abierto');
  panel.setAttribute('aria-hidden', 'true');
  velo.cerrar('detalle');
  reanudarActual();
}

export function montar() {
  botonCerrar.addEventListener('click', cerrar);

  // Solo se añade el botón si hay algo que ampliar.
  for (const pieza of estado.piezas) {
    if (!pieza.dataset.titulo && !pieza.dataset.amplia) continue;

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'ampliar';
    boton.textContent = 'Ampliar';
    boton.addEventListener('click', ev => { ev.stopPropagation(); abrir(); });
    pieza.querySelector('.pie').appendChild(boton);
  }
}
