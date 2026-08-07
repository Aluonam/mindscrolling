// Barra inferior: valorar la pieza en pantalla y enviarla.

import { estado, cambio, alCambiar } from '../estado.js';
import { avisar } from '../atomos/aviso.js';
import { ajustar, comoQueda } from '../moleculas/reputacion.js';

const barra    = document.getElementById('valoracion');
const botonSi  = document.getElementById('votoSi');
const botonNo  = document.getElementById('votoNo');
const botonEnviar = document.getElementById('enviar');

/**
 * El voto es de la pieza, pero lo que aprende es la fuente.
 *
 * La pieza de hoy no vuelve mañana, así que recordar «esta me gustó» no sirve
 * de nada. Lo que sí vuelve es de dónde salió: por eso el voto mueve la
 * reputación de la fuente, y esa reputación inclina el orden de las próximas
 * ediciones (decisión 18).
 */
function votar(valor) {
  const previo = estado.votos.get(estado.actual) || 0;
  const nuevo = previo === valor ? 0 : valor;

  if (nuevo === 0) estado.votos.delete(estado.actual);
  else estado.votos.set(estado.actual, nuevo);

  // La diferencia y no el voto: quitar un ★ resta lo mismo que sumó, y pasar
  // de ★ a × cuenta doble, que es exactamente lo que ha ocurrido.
  const fuente = estado.piezas[estado.actual].dataset.fuente;
  const reputacion = ajustar(fuente, nuevo - previo);

  // Sin esto el botón parecía no hacer nada — durante mucho tiempo, además,
  // es que no lo hacía. Se dice en futuro porque el orden ya está montado:
  // esto se nota en la próxima apertura, no en ésta.
  avisar(`${fuente} ${comoQueda(reputacion)}`);

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
