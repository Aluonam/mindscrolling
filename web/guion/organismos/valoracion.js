// Barra inferior: valorar la pieza en pantalla y enviarla.

import { estado, cambio, alCambiar } from '../estado.js';
import { avisar } from '../atomos/aviso.js';

const barra    = document.getElementById('valoracion');
const botonSi  = document.getElementById('votoSi');
const botonNo  = document.getElementById('votoNo');
const botonEnviar = document.getElementById('enviar');

function votar(valor) {
  if (estado.votos.get(estado.actual) === valor) estado.votos.delete(estado.actual);
  else estado.votos.set(estado.actual, valor);
  cambio();
}

function pintar() {
  const voto = estado.votos.get(estado.actual);
  botonSi.className = 'voto' + (voto === 1 ? ' si' : '');
  botonNo.className = 'voto' + (voto === -1 ? ' no' : '');
}

async function enviar() {
  // Se comparte el original, nunca el destilado (decisión 12).
  const pieza = estado.piezas[estado.actual];
  const enlace = pieza.dataset.enlace;
  const texto = 'Vía ' + pieza.dataset.fuente + ' — visto en MindScrolling';

  // 1) Menú nativo del móvil.
  if (navigator.share) {
    try {
      await navigator.share({ title: 'MindScrolling', text: texto, url: enlace });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // lo canceló ella
    }
  }

  // 2) Si no hay menú nativo, al portapapeles.
  try {
    await navigator.clipboard.writeText(enlace);
    avisar('Enlace del original copiado');
    return;
  } catch (err) { /* seguimos al plan C */ }

  // 3) Si tampoco deja copiar, se muestra.
  avisar(enlace);
}

export function montar() {
  barra.hidden = false;
  botonSi.addEventListener('click', () => votar(1));
  botonNo.addEventListener('click', () => votar(-1));
  botonEnviar.addEventListener('click', enviar);
  alCambiar(pintar);
  pintar();
}
