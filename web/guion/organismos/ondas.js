// El botón de sonido: enciende y apaga la ambientación.
//
// Aquí solo está el interruptor y su estado. Cómo suena vive en
// `moleculas/ambiente.js`, para poder cambiar el sonido sin tocar esto.

import { avisar } from '../atomos/aviso.js';
import { crearAmbiente } from '../moleculas/ambiente.js';

const boton = document.getElementById('sonido');

let audio = null;
let sonando = false;

function ajustarVolumen(subida) {
  if (!audio) return;
  const { ctx, maestro } = audio;
  const objetivo = sonando ? 0.55 : 0;

  maestro.gain.cancelScheduledValues(ctx.currentTime);
  maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
  maestro.gain.linearRampToValueAtTime(objetivo, ctx.currentTime + (objetivo > 0 ? subida : 0.8));

  boton.textContent = sonando ? '♪ fondo' : '♪';
}

async function alternar() {
  if (!audio) audio = crearAmbiente();
  if (!audio) { avisar('Este navegador no genera sonido'); return; }

  // Con await, y comprobando después. Los navegadores arrancan el audio
  // suspendido y solo lo despiertan dentro de un gesto; si se seguía sin
  // esperar, se programaba la subida de volumen sobre un reloj parado y no
  // sonaba nada, sin decir por qué.
  if (audio.ctx.state !== 'running') {
    try { await audio.ctx.resume(); } catch { /* se comprueba abajo */ }
  }

  if (audio.ctx.state !== 'running') {
    avisar('El navegador no deja sonar aquí');
    return;
  }

  sonando = !sonando;
  boton.classList.toggle('activo', sonando);
  boton.setAttribute('aria-pressed', String(sonando));
  ajustarVolumen(2.5);   // entra despacio: aparecer de golpe sobresalta

  if (sonando) avisar('Fondo para leer · con auriculares, además ondas alfa');
}

export function montar() {
  boton.addEventListener('click', alternar);

  // Si se cierra la pestaña con el sonido puesto, se para todo. Sin esto los
  // temporizadores de las notas siguen vivos.
  window.addEventListener('pagehide', () => {
    audio?.detener();
    audio?.ctx.close().catch(() => {});
  });
}
