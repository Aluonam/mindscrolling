// Ondas de fondo, opcionales.
//
// Dos tonos puros generados en el momento, uno por oído, separados 10 Hz.
// La diferencia se percibe como pulso alfa. Sin auriculares no funciona.

import { avisar } from '../atomos/aviso.js';

const boton = document.getElementById('sonido');

let audio = null;
let sonando = false;

function crear() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  const ctx = new Ctx();
  const maestro = ctx.createGain();
  maestro.gain.value = 0;
  maestro.connect(ctx.destination);

  // Un tono por oído: 180 Hz izquierda, 190 Hz derecha.
  for (const [hz, lado] of [[180, -1], [190, 1]]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;
    const vol = ctx.createGain();
    vol.gain.value = 0.15;
    const pan = ctx.createStereoPanner();
    pan.pan.value = lado;
    osc.connect(vol).connect(pan).connect(maestro);
    osc.start();
  }

  // Ruido grave filtrado, para que no suene a pitido.
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  let previo = 0;
  for (let i = 0; i < datos.length; i++) {
    const blanco = Math.random() * 2 - 1;
    previo = (previo + 0.02 * blanco) / 1.02;
    datos[i] = previo * 3.2;
  }
  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.loop = true;
  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 480;
  const volRuido = ctx.createGain();
  volRuido.gain.value = 0.12;
  fuente.connect(filtro).connect(volRuido).connect(maestro);
  fuente.start();

  return { ctx, maestro };
}

function ajustarVolumen(subida) {
  if (!audio) return;
  const { ctx, maestro } = audio;
  const objetivo = sonando ? 0.5 : 0;

  maestro.gain.cancelScheduledValues(ctx.currentTime);
  maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
  maestro.gain.linearRampToValueAtTime(objetivo, ctx.currentTime + (objetivo > 0 ? subida : 0.6));

  boton.textContent = sonando ? '♪ ondas' : '♪';
}

function alternar() {
  if (!audio) audio = crear();
  if (!audio) { avisar('Este navegador no genera sonido'); return; }

  if (audio.ctx.state === 'suspended') audio.ctx.resume();

  sonando = !sonando;
  boton.classList.toggle('activo', sonando);
  boton.setAttribute('aria-pressed', String(sonando));
  ajustarVolumen(1.4);

  if (sonando) avisar('Ondas alfa · mejor con auriculares');
}

export function montar() {
  boton.addEventListener('click', alternar);
}
