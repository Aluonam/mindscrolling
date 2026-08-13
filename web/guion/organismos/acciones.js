// Las dos cosas que se pueden hacer con la pieza en pantalla: compartirla y
// guardarla.
//
// Antes aquí había tres botones de texto y dos eran votos. Los votos no
// alimentaban nada —vivían en memoria y se perdían al recargar— y ocupaban dos
// tercios de la barra prometiendo un aprendizaje que no existía. Compartir y
// guardar sí hacen algo el mismo día que se pulsan.

import { estado, alCambiar } from '../estado.js';
import { avisar } from '../atomos/aviso.js';
import * as guardados from '../atomos/guardados.js';

const barra = document.getElementById('acciones');
const botonCompartir = document.getElementById('compartir');
const botonGuardar = document.getElementById('guardar');

/** Lo que hace falta saber de la pieza en pantalla. Sale del DOM, no del JSON:
 *  la pieza ya lo lleva en data-* para el índice y la ampliación. */
function piezaActual() {
  const pieza = estado.piezas[estado.actual];
  if (!pieza) return null;

  return {
    enlace: pieza.dataset.enlace,
    titulo: pieza.dataset.titulo,
    fuente: pieza.dataset.fuente,
    ambito: pieza.dataset.ambito,
  };
}

async function compartir() {
  const pieza = piezaActual();
  if (!pieza) return;

  // Se comparte el original, nunca el destilado (decisión 12).
  const texto = 'Vía ' + pieza.fuente + ' — visto en MindScrolling';

  // 1) Menú nativo del móvil.
  if (navigator.share) {
    try {
      await navigator.share({ title: 'MindScrolling', text: texto, url: pieza.enlace });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // lo canceló ella
    }
  }

  // 2) Si no hay menú nativo, al portapapeles.
  try {
    await navigator.clipboard.writeText(pieza.enlace);
    avisar('Enlace del original copiado');
    return;
  } catch (err) { /* seguimos al plan C */ }

  // 3) Si tampoco deja copiar, se muestra.
  avisar(pieza.enlace);
}

function guardar() {
  const pieza = piezaActual();
  if (!pieza) return;

  avisar(guardados.alternar(pieza)
    ? 'Guardado · lo tienes en el menú'
    : 'Quitado de guardados');

  pintar();
}

function pintar() {
  const pieza = piezaActual();
  const guardada = pieza ? guardados.estaGuardado(pieza.enlace) : false;

  botonGuardar.classList.toggle('activa', guardada);
  botonGuardar.setAttribute('aria-pressed', String(guardada));
  botonGuardar.setAttribute('aria-label', guardada ? 'Quitar de guardados' : 'Guardar el original');
}

export function montar() {
  barra.hidden = false;
  botonCompartir.addEventListener('click', compartir);
  botonGuardar.addEventListener('click', guardar);

  // Al cambiar de pieza, el botón tiene que decir la verdad sobre ESA pieza.
  alCambiar(pintar);
  pintar();
}
