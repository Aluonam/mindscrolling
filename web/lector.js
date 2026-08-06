// Cómo se lee la edición del día.
//
// Lo único que este fichero sabe del resto del proyecto es que hay un
// `ediciones/ultima.json` con una fecha y una lista de piezas. No sabe de
// dónde salieron, ni quién las resumió, ni que existe `src/`.

const carril     = document.getElementById('carril');
const cabecera   = document.getElementById('cabecera');
const valoracion = document.getElementById('valoracion');
const segmentos  = document.getElementById('segmentos');
const botonSi    = document.getElementById('votoSi');
const botonNo    = document.getElementById('votoNo');
const botonRitmo = document.getElementById('ritmo');
const botonEnviar= document.getElementById('enviar');
const botonSonido= document.getElementById('sonido');
const aviso      = document.getElementById('aviso');

const NOMBRE_AMBITO = { tecnico: 'Técnico', clinico: 'Clínico', gestion: 'Gestión' };

// ---------- La edición del día ----------

let edicion = null;
try {
  const respuesta = await fetch('../ediciones/ultima.json', { cache: 'no-store' });
  if (respuesta.ok) edicion = await respuesta.json();
} catch (err) { /* sin red o sin fichero: se trata igual que sin edición */ }

if (!edicion || !edicion.piezas || edicion.piezas.length === 0) {
  carril.innerHTML =
    '<div class="vacio"><b>Todavía no hay ninguna edición</b>' +
    '<span>Cada madrugada se publica una nueva. Para generarla ahora mismo, ' +
    'ejecuta <code>npm run edicion</code>.</span></div>';
} else {
  arrancar(edicion);
}

function arrancar(edicion) {
  cabecera.hidden = false;
  valoracion.hidden = false;
  document.getElementById('fechaEdicion').textContent = fechaLegible(edicion.fecha);

  // Recompensa variable: el orden nunca va de mejor a peor. Se baraja en cada
  // apertura, así que nunca sabes qué viene detrás.
  const enOrden = [...edicion.piezas];
  for (let i = enOrden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [enOrden[i], enOrden[j]] = [enOrden[j], enOrden[i]];
  }

  enOrden.forEach(dato => carril.appendChild(dibujar(dato)));

  // El cierre de la edición viaja siempre a la última.
  const cierre = document.createElement('div');
  cierre.className = 'arranque';
  cierre.textContent = 'Fin de la edición · vuelve mañana';
  carril.lastElementChild.appendChild(cierre);

  const piezas = Array.from(carril.querySelectorAll('.pieza'));

  const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const RITMOS = [
    { etiqueta: '0,7×', factor: 1.45 },
    { etiqueta: '1,0×', factor: 1.00 },
    { etiqueta: '1,4×', factor: 0.72 },
  ];
  let ritmoActual = 1;

  const votos = new Map();
  let actual = 0;

  // Una barra de progreso por pieza, como en las historias.
  piezas.forEach(() => {
    const s = document.createElement('div');
    s.className = 'segmento';
    s.innerHTML = '<i></i>';
    segmentos.appendChild(s);
  });
  const barras = Array.from(segmentos.querySelectorAll('i'));

  const estados = piezas.map(pieza => ({
    pieza,
    nodos: Array.from(pieza.querySelectorAll('.destilado w')),
    indice: 0,
    temporizador: null,
    detenida: false,
    terminada: false,
  }));

  // El tiempo por palabra crece con su longitud, y los términos clave
  // se sostienen un poco más para que den tiempo a registrarse.
  function duracion(nodo, posicion, factor) {
    const base = 132 + nodo.textContent.length * 26;
    const peso = nodo.classList.contains('clave') ? 1.28 : 1;
    // El gancho: las primeras palabras entran casi de golpe y a partir de
    // la quinta se asienta en el ritmo de lectura normal.
    const gancho = posicion < 5 ? 0.34 + posicion * 0.14 : 1;
    return Math.min(560, base) * peso * gancho * factor;
  }

  function pintarBarra(i) {
    const e = estados[i];
    barras[i].style.width = (e.nodos.length ? (e.indice / e.nodos.length) * 100 : 100) + '%';
  }

  function avanzar(i) {
    const e = estados[i];
    if (e.detenida || e.terminada) return;

    if (e.indice >= e.nodos.length) {
      e.terminada = true;
      pintarBarra(i);
      marcarLeida(i);
      return;
    }

    const posicion = e.indice;
    const nodo = e.nodos[posicion];
    nodo.classList.add('viva');
    e.indice++;
    pintarBarra(i);

    e.temporizador = setTimeout(
      () => avanzar(i),
      duracion(nodo, posicion, RITMOS[ritmoActual].factor)
    );
  }

  function revelarTodo(i) {
    const e = estados[i];
    clearTimeout(e.temporizador);
    e.nodos.forEach(n => n.classList.add('viva'));
    e.indice = e.nodos.length;
    e.terminada = true;
    pintarBarra(i);
    marcarLeida(i);
  }

  function reiniciar(i) {
    const e = estados[i];
    clearTimeout(e.temporizador);
    e.nodos.forEach(n => n.classList.remove('viva'));
    e.indice = 0;
    e.terminada = false;
    e.detenida = false;
    e.pieza.classList.remove('detenida');
    barras[i].style.width = '0%';
  }

  function activar(i) {
    if (i === actual) return;
    clearTimeout(estados[actual].temporizador);
    actual = i;

    // La cabecera y los botones adoptan el color del ámbito activo.
    const ambito = piezas[i].dataset.ambito;
    document.documentElement.style.setProperty(
      '--acento', 'var(--' + (NOMBRE_AMBITO[ambito] ? ambito : 'tecnico') + ')'
    );

    botonSi.className = 'voto' + (votos.get(i) === 1 ? ' si' : '');
    botonNo.className = 'voto' + (votos.get(i) === -1 ? ' no' : '');

    reiniciar(i);
    if (menosMovimiento) revelarTodo(i);
    else setTimeout(() => avanzar(i), 320);

    ajustarVolumen(0.9);
    refrescarListado();
  }

  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting && entrada.intersectionRatio > 0.6) {
        activar(piezas.indexOf(entrada.target));
      }
    });
  }, { root: carril, threshold: [0.6] });

  piezas.forEach(p => observador.observe(p));

  // Tocar la pieza: para y sigue. Si ya terminó, la vuelve a empezar.
  piezas.forEach((pieza, i) => {
    pieza.addEventListener('click', ev => {
      if (ev.target.closest('a')) return;
      const e = estados[i];

      if (e.terminada) { reiniciar(i); avanzar(i); return; }

      e.detenida = !e.detenida;
      pieza.classList.toggle('detenida', e.detenida);
      if (e.detenida) clearTimeout(e.temporizador);
      else avanzar(i);
    });
  });

  function votar(valor) {
    if (votos.get(actual) === valor) votos.delete(actual);
    else votos.set(actual, valor);

    const v = votos.get(actual);
    botonSi.className = 'voto' + (v === 1 ? ' si' : '');
    botonNo.className = 'voto' + (v === -1 ? ' no' : '');
    refrescarListado();
  }

  botonSi.addEventListener('click', () => votar(1));
  botonNo.addEventListener('click', () => votar(-1));

  // ---------- Enviar ----------

  let avisoTemporizador = null;

  function avisar(texto) {
    aviso.textContent = texto;
    aviso.classList.add('visible');
    clearTimeout(avisoTemporizador);
    avisoTemporizador = setTimeout(() => aviso.classList.remove('visible'), 2600);
  }

  async function enviar() {
    // Lo que se comparte es SIEMPRE el original, nunca nuestro destilado.
    const enlace = piezas[actual].dataset.enlace;
    const texto = 'Vía ' + piezas[actual].dataset.fuente + ' — visto en MindScrolling';

    // 1) Menú nativo de compartir del móvil.
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

    // 3) Y si el navegador tampoco deja copiar, se lo enseñamos.
    avisar(enlace);
  }

  botonEnviar.addEventListener('click', enviar);

  // ---------- Ondas de fondo ----------
  // No es un archivo de música: son dos tonos puros generados en el momento,
  // uno por oído, separados 10 Hz. El cerebro percibe esa diferencia como un
  // pulso lento (rango alfa). Necesita auriculares para funcionar como tal.

  let audio = null;
  let sonando = false;

  function crearAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    const ctx = new Ctx();
    const maestro = ctx.createGain();
    maestro.gain.value = 0;
    maestro.connect(ctx.destination);

    // Un tono por oído: 180 Hz izquierda, 190 Hz derecha.
    [[180, -1], [190, 1]].forEach(([hz, lado]) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz;
      const vol = ctx.createGain();
      vol.gain.value = 0.15;
      const pan = ctx.createStereoPanner();
      pan.pan.value = lado;
      osc.connect(vol).connect(pan).connect(maestro);
      osc.start();
    });

    // Una capa de ruido grave y filtrado, para que no suene a pitido.
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

    botonSonido.textContent = sonando ? '♪ ondas' : '♪';
  }

  function alternarSonido() {
    if (!audio) audio = crearAudio();
    if (!audio) { avisar('Este navegador no genera sonido'); return; }

    if (audio.ctx.state === 'suspended') audio.ctx.resume();

    sonando = !sonando;
    botonSonido.classList.toggle('activo', sonando);
    botonSonido.setAttribute('aria-pressed', String(sonando));
    ajustarVolumen(1.4);

    if (sonando) avisar('Ondas alfa · mejor con auriculares');
  }

  botonSonido.addEventListener('click', alternarSonido);

  // ---------- Índice de la edición y marcador ----------

  const velo          = document.getElementById('velo');
  const panel         = document.getElementById('indice');
  const listado       = document.getElementById('listado');
  const resumenUso    = document.getElementById('resumenUso');
  const contadorBoton = document.getElementById('contadorBoton');
  const abrirBoton    = document.getElementById('abrirIndice');
  const cerrarBoton   = document.getElementById('cerrarIndice');

  const leidas = new Set();
  let segundosUso = 0;

  // Solo cuenta el tiempo con la app delante; si te vas, el reloj se para.
  setInterval(() => {
    if (document.hidden) return;
    segundosUso++;
    if (panel.classList.contains('abierto')) pintarMarcador();
  }, 1000);

  function tiempoLegible() {
    if (segundosUso < 60) return segundosUso + ' s';
    return Math.floor(segundosUso / 60) + ' min';
  }

  function pintarMarcador() {
    resumenUso.textContent =
      tiempoLegible() + ' de uso · ' + leidas.size + ' de ' + piezas.length + ' leídas';
    contadorBoton.textContent = String(leidas.size);
  }

  // Una pieza cuenta como leída cuando su destilado termina de aparecer:
  // el tiempo de lectura es mejor señal que cualquier botón.
  function marcarLeida(i) {
    if (leidas.has(i)) return;
    leidas.add(i);
    pintarMarcador();
    refrescarListado();
  }

  function avanceDe(i) {
    const palabras = piezas[i].querySelector('.destilado').textContent.trim().split(/\s+/);
    return palabras.slice(0, 10).join(' ') + (palabras.length > 10 ? '…' : '');
  }

  function construirListado() {
    listado.textContent = '';
    piezas.forEach((pieza, i) => {
      const fila = document.createElement('button');
      fila.type = 'button';
      fila.className = 'fila';
      fila.dataset.ambito = pieza.dataset.ambito;
      fila.innerHTML =
        '<span class="punto"></span>' +
        '<span><span class="fuente"></span><span class="avance"></span></span>' +
        '<span class="marca-fila"></span>';
      fila.querySelector('.fuente').textContent = pieza.dataset.fuente;
      fila.querySelector('.avance').textContent = avanceDe(i);
      fila.addEventListener('click', () => {
        cerrarIndice();
        piezas[i].scrollIntoView({ behavior: menosMovimiento ? 'auto' : 'smooth' });
      });
      listado.appendChild(fila);
    });
  }

  function refrescarListado() {
    Array.from(listado.children).forEach((fila, i) => {
      fila.classList.toggle('actual', i === actual);
      fila.classList.toggle('leida', leidas.has(i));
      const voto = votos.get(i);
      fila.querySelector('.marca-fila').textContent =
        voto === 1 ? '★' : voto === -1 ? '×' : (leidas.has(i) ? '✓' : '');
    });
  }

  function abrirIndice() {
    panel.classList.add('abierto');
    velo.classList.add('abierto');
    panel.setAttribute('aria-hidden', 'false');
    abrirBoton.setAttribute('aria-expanded', 'true');
    refrescarListado();
    pintarMarcador();
    cerrarBoton.focus();
  }

  function cerrarIndice() {
    panel.classList.remove('abierto');
    velo.classList.remove('abierto');
    panel.setAttribute('aria-hidden', 'true');
    abrirBoton.setAttribute('aria-expanded', 'false');
  }

  abrirBoton.addEventListener('click', abrirIndice);
  cerrarBoton.addEventListener('click', cerrarIndice);
  velo.addEventListener('click', () => { cerrarDetalle(); cerrarIndice(); });
  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (detalle.classList.contains('abierto')) cerrarDetalle();
    else if (panel.classList.contains('abierto')) cerrarIndice();
  });

  // ---------- Filtrar por ámbito ----------
  // Los chips salen de la edición: si un día no hay nada de gestión, ese
  // filtro no aparece en lugar de quedarse vacío.

  const contenedorFiltros = document.getElementById('filtros');
  const presentes = [...new Set(piezas.map(p => p.dataset.ambito))];
  const AMBITOS = [{ id: 'todo', nombre: 'Todo' }].concat(
    presentes.map(id => ({ id, nombre: NOMBRE_AMBITO[id] || id }))
  );
  let filtro = 'todo';

  function aplicarFiltro(nuevo) {
    filtro = nuevo;

    piezas.forEach((pieza, i) => {
      const visible = filtro === 'todo' || pieza.dataset.ambito === filtro;
      pieza.style.display                 = visible ? '' : 'none';
      segmentos.children[i].style.display = visible ? '' : 'none';
      listado.children[i].style.display   = visible ? '' : 'none';
    });

    Array.from(contenedorFiltros.children).forEach(chip => {
      chip.classList.toggle('activa', chip.dataset.id === filtro);
      chip.setAttribute('aria-pressed', String(chip.dataset.id === filtro));
    });

    // Si la pieza en pantalla se ha quedado fuera del filtro, saltamos a la
    // primera que sí entra.
    if (piezas[actual].style.display === 'none') {
      const primera = piezas.find(p => p.style.display !== 'none');
      if (primera) primera.scrollIntoView({ behavior: 'auto' });
    }
  }

  AMBITOS.forEach(ambito => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.id = ambito.id;
    chip.textContent = ambito.nombre;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => aplicarFiltro(ambito.id));
    contenedorFiltros.appendChild(chip);
  });

  // ---------- Ampliar la pieza ----------
  // El segundo nivel de lectura es el resumen del propio autor, no otro
  // destilado nuestro: pasar de nuestras palabras a las suyas antes de
  // mandarte al original.

  const detalle       = document.getElementById('detalle');
  const detalleFuente = document.getElementById('detalleFuente');
  const detalleTitulo = document.getElementById('detalleTitulo');
  const detalleTexto  = document.getElementById('detalleTexto');
  const detalleEnlace = document.getElementById('detalleEnlace');
  const detalleCuerpo = document.getElementById('detalleCuerpo');
  const cerrarDetalleBoton = document.getElementById('cerrarDetalle');

  function abrirDetalle() {
    const pieza = piezas[actual];
    detalleFuente.textContent = pieza.dataset.fuente;
    detalleTitulo.textContent = pieza.dataset.titulo || '';
    detalleTexto.textContent  = pieza.dataset.amplia || '';
    detalleCuerpo.scrollTop = 0;

    detalleEnlace.href = pieza.dataset.enlace || '#';

    detalle.classList.add('abierto');
    velo.classList.add('abierto');
    detalle.setAttribute('aria-hidden', 'false');

    // Mientras lees la ampliación, el destilado se queda quieto.
    const e = estados[actual];
    e.detenida = true;
    clearTimeout(e.temporizador);

    cerrarDetalleBoton.focus();
  }

  function cerrarDetalle() {
    detalle.classList.remove('abierto');
    detalle.setAttribute('aria-hidden', 'true');
    if (!panel.classList.contains('abierto')) velo.classList.remove('abierto');

    const e = estados[actual];
    if (e.detenida) { e.detenida = false; avanzar(actual); }
  }

  // El botón de ampliar se añade al pie de cada pieza que tenga qué ampliar.
  piezas.forEach(pieza => {
    if (!pieza.dataset.titulo && !pieza.dataset.amplia) return;
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'ampliar';
    boton.textContent = 'Ampliar';
    boton.addEventListener('click', ev => { ev.stopPropagation(); abrirDetalle(); });
    pieza.querySelector('.pie').appendChild(boton);
  });

  cerrarDetalleBoton.addEventListener('click', cerrarDetalle);

  // ---------- Ajustes: tipo de letra ----------
  // Tres caras muy distintas entre sí y presentes en móvil y ordenador.
  // La escala compensa que un mismo tamaño se ve más pequeño en las serif.

  const LETRAS = [
    { id: 'verdana',   nombre: 'Aa', nota: 'ancha',    pila: 'Verdana, Geneva, sans-serif',        escala: 1    },
    { id: 'georgia',   nombre: 'Aa', nota: 'serif',    pila: 'Georgia, "Times New Roman", serif',  escala: 1.09 },
    { id: 'trebuchet', nombre: 'Aa', nota: 'estrecha', pila: '"Trebuchet MS", Tahoma, sans-serif', escala: 1.06 },
  ];

  const contenedorLetras = document.getElementById('letras');

  function aplicarLetra(id) {
    const elegida = LETRAS.find(l => l.id === id) || LETRAS[0];
    document.documentElement.style.setProperty('--letra', elegida.pila);
    document.documentElement.style.setProperty('--escala-letra', String(elegida.escala));

    Array.from(contenedorLetras.children).forEach(boton => {
      boton.classList.toggle('elegida', boton.dataset.id === elegida.id);
      boton.setAttribute('aria-pressed', String(boton.dataset.id === elegida.id));
    });

    try { localStorage.setItem('ms-letra', elegida.id); } catch (err) { /* sin memoria, da igual */ }
  }

  LETRAS.forEach(letra => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'letra';
    boton.dataset.id = letra.id;
    boton.style.fontFamily = letra.pila;
    boton.setAttribute('aria-pressed', 'false');
    boton.innerHTML = '<strong></strong><small></small>';
    boton.querySelector('strong').textContent = letra.nombre;
    boton.querySelector('small').textContent = letra.nota;
    boton.addEventListener('click', () => aplicarLetra(letra.id));
    contenedorLetras.appendChild(boton);
  });

  let letraGuardada = 'verdana';
  try { letraGuardada = localStorage.getItem('ms-letra') || 'verdana'; } catch (err) { /* nada */ }
  aplicarLetra(letraGuardada);

  construirListado();
  aplicarFiltro('todo');
  pintarMarcador();

  botonRitmo.addEventListener('click', () => {
    ritmoActual = (ritmoActual + 1) % RITMOS.length;
    botonRitmo.textContent = RITMOS[ritmoActual].etiqueta;
  });

  activar(0);
  if (!menosMovimiento) setTimeout(() => avanzar(0), 500);
}

// ---------- Dibujar una pieza ----------

function dibujar(dato) {
  const articulo = document.createElement('article');
  articulo.className = 'pieza';
  articulo.dataset.ambito = dato.fuente.ambito;
  articulo.dataset.fuente = dato.fuente.nombre;
  articulo.dataset.enlace = dato.enlace;
  articulo.dataset.titulo = dato.titulo || '';
  articulo.dataset.amplia = dato.resumenOriginal || '';

  const procedencia = document.createElement('div');
  procedencia.className = 'procedencia';
  const ambito = document.createElement('span');
  ambito.className = 'ambito';
  ambito.textContent = NOMBRE_AMBITO[dato.fuente.ambito] || dato.fuente.ambito;
  const barra = document.createElement('span');
  barra.className = 'separador';
  barra.textContent = '/';
  const nombre = document.createElement('span');
  nombre.textContent = dato.fuente.nombre;
  procedencia.append(ambito, barra, nombre);

  const parrafo = document.createElement('p');
  parrafo.className = 'destilado';
  trocear(parrafo, dato.destilado);

  const pie = document.createElement('div');
  pie.className = 'pie';
  const tiempo = document.createElement('span');
  tiempo.textContent = segundosDeLectura(dato.destilado.texto) + ' s de lectura';
  const punto = document.createElement('span');
  punto.className = 'separador';
  punto.textContent = '·';
  const enlace = document.createElement('a');
  enlace.className = 'original';
  enlace.href = dato.enlace;
  enlace.target = '_blank';
  enlace.rel = 'noopener';
  enlace.textContent = 'Abrir el original';
  pie.append(tiempo, punto, enlace);

  const pausa = document.createElement('div');
  pausa.className = 'pausa';
  pausa.textContent = 'En pausa · toca para seguir';

  articulo.append(procedencia, parrafo, pie, pausa);
  return articulo;
}

/**
 * Parte el destilado en palabras sueltas y marca las que la IA señaló como
 * término clave.
 *
 * Un término puede ser de varias palabras («integración sensorial»), y
 * entonces solo cuenta si aparecen seguidas: marcar por separado cada
 * palabra resaltaría «sensorial» en cualquier frase donde salga suelta.
 */
function trocear(parrafo, destilado) {
  const palabras = destilado.texto.trim().split(/\s+/);
  const limpiar = p => p.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  const normales = palabras.map(limpiar);

  const claves = new Set();
  (destilado.clave ?? []).forEach(termino => {
    const partes = String(termino).trim().split(/\s+/).map(limpiar).filter(Boolean);
    if (partes.length === 0) return;

    for (let i = 0; i + partes.length <= normales.length; i++) {
      if (partes.every((parte, j) => normales[i + j] === parte)) {
        for (let j = 0; j < partes.length; j++) claves.add(i + j);
      }
    }
  });

  palabras.forEach((palabra, i) => {
    const w = document.createElement('w');
    w.textContent = palabra;
    if (claves.has(i)) w.classList.add('clave');
    parrafo.appendChild(w);
    if (i < palabras.length - 1) parrafo.appendChild(document.createTextNode(' '));
  });
}

/** A ritmo de lectura tranquila: unas 200 palabras por minuto. */
function segundosDeLectura(texto) {
  return Math.max(10, Math.round(texto.trim().split(/\s+/).length / 200 * 60));
}

function fechaLegible(fecha) {
  const [anio, mes, dia] = String(fecha).split('-');
  return dia && mes ? `${dia}/${mes}` : String(fecha);
}
