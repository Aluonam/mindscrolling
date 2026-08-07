// La ambientación sonora: un fondo para leer, sintetizado en el momento.
//
// No hay fichero de música. Ni se descarga, ni ocupa, ni caduca, ni depende de
// que nadie nos deje usarlo — es la misma razón por la que el lector es texto
// y no vídeo (decisión 10).
//
// Tres capas, de grave a agudo:
//
// 1. Un acorde sostenido que no se mueve. Es la base.
// 2. Notas sueltas y espaciadas de una escala pentatónica, que es la que no
//    suena mal se toque cuando se toque: por eso puede improvisar sola sin
//    desafinar nunca.
// 3. Los dos tonos binaurales de siempre, debajo del todo. Solo con
//    auriculares hacen algo, pero no estorban.
//
// Todo en el rango medio, no en los 180 Hz de antes: un altavoz de móvil no
// reproduce los graves, y por eso «no sonaba nada».

/** La menor pentatónica. Cualquier combinación de estas notas suena bien. */
const PENTATONICA = [220.00, 261.63, 293.66, 329.63, 392.00];

/**
 * El acorde de fondo: tónica, quinta y octava. Sin tercera, que tiñe de alegre
 * o de triste y aquí no toca.
 *
 * En la octava de 220-440 Hz y no una más abajo: un altavoz de móvil o de
 * portátil no reproduce los graves, y ahí estaba el «no se oye nada». El 110
 * se queda de fondo, muy bajo, para dar cuerpo con auriculares.
 */
const ACORDE = [220.00, 329.63, 440.00];
const RAIZ_GRAVE = 110.00;

const SILENCIO_MINIMO = 5000;
const SILENCIO_EXTRA = 9000;

export function crearAmbiente() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;

  const ctx = new Ctx();

  const maestro = ctx.createGain();
  maestro.gain.value = 0;
  maestro.connect(ctx.destination);

  // Un filtro común los redondea a todos: quita el filo digital y deja algo
  // parecido a un pad.
  const suavizado = ctx.createBiquadFilter();
  suavizado.type = 'lowpass';
  suavizado.frequency.value = 1400;
  suavizado.Q.value = 0.7;
  suavizado.connect(maestro);

  colchon(ctx, suavizado);
  aire(ctx, suavizado);
  const detenerNotas = notasSueltas(ctx, suavizado);
  binaural(ctx, maestro);

  return { ctx, maestro, detener: detenerNotas };
}

/** El acorde sostenido. Dos osciladores por nota, ligeramente desafinados
 *  entre sí: es lo que hace que suene ancho en vez de plano. */
function colchon(ctx, destino) {
  // La raíz grave, sola y bajita: da cuerpo con auriculares y no molesta sin
  // ellos, porque el altavoz simplemente no la reproduce.
  const grave = ctx.createOscillator();
  grave.type = 'sine';
  grave.frequency.value = RAIZ_GRAVE;
  const volGrave = ctx.createGain();
  volGrave.gain.value = 0.04;
  grave.connect(volGrave).connect(destino);
  grave.start();

  for (const hz of ACORDE) {
    for (const desvio of [-0.6, 0.6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = hz + desvio;

      const vol = ctx.createGain();
      vol.gain.value = 0.05;

      // Una oscilación muy lenta del volumen. Sin esto el acorde se percibe
      // como un zumbido fijo y cansa a los dos minutos.
      const respiracion = ctx.createOscillator();
      respiracion.frequency.value = 0.05 + Math.random() * 0.04;
      const profundidad = ctx.createGain();
      profundidad.gain.value = 0.02;
      respiracion.connect(profundidad).connect(vol.gain);
      respiracion.start();

      osc.connect(vol).connect(destino);
      osc.start();
    }
  }
}

/** Ruido muy filtrado. No se identifica como sonido: solo quita el vacío. */
function aire(ctx, destino) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const datos = buffer.getChannelData(0);
  let previo = 0;
  for (let i = 0; i < datos.length; i++) {
    previo = (previo + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    datos[i] = previo * 3;
  }

  const fuente = ctx.createBufferSource();
  fuente.buffer = buffer;
  fuente.loop = true;

  const filtro = ctx.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = 700;

  const vol = ctx.createGain();
  vol.gain.value = 0.06;

  fuente.connect(filtro).connect(vol).connect(destino);
  fuente.start();
}

/**
 * Notas sueltas cada 5-14 segundos, elegidas al azar de la pentatónica.
 *
 * Espaciadas a propósito: esto acompaña a la lectura, no compite con ella. Una
 * melodía reconocible haría que la siguieras a ella en vez de al texto.
 */
function notasSueltas(ctx, destino) {
  let temporizador = null;
  let parado = false;

  function tocar() {
    if (parado) return;

    const hz = PENTATONICA[Math.floor(Math.random() * PENTATONICA.length)];
    // A veces una octava arriba, para que no todas suenen a la misma altura.
    const nota = Math.random() < 0.3 ? hz * 2 : hz;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = nota;

    const vol = ctx.createGain();
    const ahora = ctx.currentTime;
    // Entrada lenta y caída larga: una campana, no una tecla.
    vol.gain.setValueAtTime(0, ahora);
    vol.gain.linearRampToValueAtTime(0.09, ahora + 1.2);
    vol.gain.exponentialRampToValueAtTime(0.0001, ahora + 6);

    osc.connect(vol).connect(destino);
    osc.start(ahora);
    osc.stop(ahora + 6.5);

    temporizador = setTimeout(tocar, SILENCIO_MINIMO + Math.random() * SILENCIO_EXTRA);
  }

  temporizador = setTimeout(tocar, 2000);

  return () => { parado = true; clearTimeout(temporizador); };
}

/** Los dos tonos de siempre: 180 Hz a un oído, 190 al otro. La diferencia de
 *  10 Hz cae en el rango alfa. Solo funciona con auriculares. */
function binaural(ctx, destino) {
  for (const [hz, lado] of [[180, -1], [190, 1]]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz;

    const vol = ctx.createGain();
    vol.gain.value = 0.1;

    const pan = ctx.createStereoPanner();
    pan.pan.value = lado;

    osc.connect(vol).connect(pan).connect(destino);
    osc.start();
  }
}
