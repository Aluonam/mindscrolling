// El panel de fuentes: de dónde sale lo que lees, y qué entra y qué no.
//
// Se abre desde la pestaña «Fuentes» del menú, junto a Edición y Guardados.
// Estuvo escondido detrás de cinco toques en el sello y duró lo que tardó
// alguien en buscarlo y no encontrarlo: esconder una pantalla no la protege,
// solo la hace inútil. Lo que la protege es que sin identificarse no se ve.
//
// Dos efectos distintos, y el panel lo dice todo el rato:
//   · Apagar una fuente aquí la esconde en lo que estás leyendo, al momento.
//   · Publicar el catálogo hace que la acción de la madrugada deje de leerla,
//     y ahí es donde se dejan de gastar tokens.

import { estado } from '../estado.js';
import { avisar } from '../atomos/aviso.js';
import { nombreDe } from '../atomos/ambitos.js';
import { refrescar } from './indice.js';
import * as catalogo from '../atomos/catalogo.js';
import * as servicio from '../atomos/servicio.js';
import * as sesion from '../atomos/sesion.js';

const panel = document.getElementById('fuentes');
const lista = document.getElementById('listaFuentes');
const buscador = document.getElementById('buscarFuente');
const resumen = document.getElementById('resumenFuentes');
const botonCerrar = document.getElementById('cerrarFuentes');
const campoUsuario = document.getElementById('usuario');
const campoClave = document.getElementById('clave');
const cajaServicio = document.getElementById('cajaServicio');
const campoDireccion = document.getElementById('direccionServicio');
const botonComprobarServicio = document.getElementById('comprobarServicio');
const avisoServicio = document.getElementById('avisoServicio');
const cajaIdentificacion = document.getElementById('identificacion');
const cuerpo = document.getElementById('cuerpoFuentes');
const botonEntrar = document.getElementById('entrar');
const botonSalir = document.getElementById('salir');
const avisoIdentificacion = document.getElementById('avisoIdentificacion');
const formularioAlta = document.getElementById('alta');
const campoWeb = document.getElementById('altaWeb');
const campoNombre = document.getElementById('altaNombre');
const campoAmbito = document.getElementById('altaAmbito');
const botonComprobar = document.getElementById('comprobar');
const resultadoAlta = document.getElementById('altaResultado');

/**
 * Cuántas piezas ha puesto cada fuente en lo que estás leyendo hoy.
 *
 * Se cuenta por nombre porque es lo que las piezas llevan en el DOM, y es la
 * respuesta a la única pregunta que importa aquí: ¿esta fuente me aporta algo?
 */
let aportacion = new Map();
let cargado = false;

export function estaAbierto() {
  return panel.classList.contains('abierta');
}

export async function abrir() {
  panel.classList.add('abierta');
  panel.setAttribute('aria-hidden', 'false');

  // Si quedaba credencial de la última vez, se revalida sola: identificarse a
  // mano cada vez que se abre el panel cansa y no protege de nada más.
  if (!sesion.identificada()) sesion.recordar();
  mostrarSegunSesion();
  if (!sesion.identificada()) return;

  if (!cargado) {
    lista.textContent = 'Cargando el catálogo…';
    try {
      await catalogo.cargar();
      cargado = true;
    } catch (err) {
      lista.textContent = 'No se ha podido leer el catálogo: ' + err.message;
      return;
    }
  }

  pintar();
}

export function cerrar() {
  panel.classList.remove('abierta');
  panel.setAttribute('aria-hidden', 'true');
}

function pintar() {
  const busqueda = buscador.value.trim().toLowerCase();
  const todas = catalogo.fuentes();

  lista.textContent = '';

  for (const ambito of ['tecnico', 'clinico', 'gestion']) {
    const suyas = todas.filter(f => f.ambito === ambito && encaja(f, busqueda));
    if (suyas.length === 0) continue;

    const titulo = document.createElement('div');
    titulo.className = 'fuentes-ambito';
    const activas = suyas.filter(f => f.estado === 'aprobada').length;
    titulo.textContent = `${nombreDe(ambito)} · ${activas} de ${suyas.length} activas`;
    lista.appendChild(titulo);

    // Las que más aportan, arriba: son sobre las que de verdad se decide.
    suyas.sort((a, b) => (aportacion.get(b.nombre) ?? 0) - (aportacion.get(a.nombre) ?? 0));
    for (const fuente of suyas) lista.appendChild(fila(fuente));
  }

  if (!lista.hasChildNodes()) lista.textContent = 'Ninguna fuente con ese nombre.';

  pintarResumen();
}

function encaja(fuente, busqueda) {
  if (!busqueda) return true;
  return (fuente.nombre + ' ' + fuente.id + ' ' + (fuente.categoria ?? ''))
    .toLowerCase()
    .includes(busqueda);
}

function fila(fuente) {
  const caja = document.createElement('div');
  caja.className = 'fuente';
  caja.dataset.estado = fuente.estado;
  if (fuente.cambiada) caja.classList.add('cambiada');

  const texto = document.createElement('div');
  texto.className = 'fuente-texto';

  const nombre = document.createElement('b');
  nombre.textContent = fuente.nombre;

  const detalle = document.createElement('span');
  const puestas = aportacion.get(fuente.nombre) ?? 0;
  const trozos = [];
  if (puestas > 0) trozos.push(`${puestas} en esta edición`);
  if (fuente.estado !== 'aprobada') trozos.push(fuente.estado);
  if (fuente.cambiada) trozos.push('sin publicar');
  detalle.textContent = trozos.join(' · ') || 'sin piezas hoy';

  texto.append(nombre, detalle);

  const interruptor = document.createElement('button');
  interruptor.className = 'interruptor';
  interruptor.type = 'button';
  const activa = fuente.estado === 'aprobada';
  interruptor.setAttribute('aria-pressed', String(activa));
  interruptor.setAttribute('aria-label', `${activa ? 'Apagar' : 'Encender'} ${fuente.nombre}`);
  interruptor.addEventListener('click', () => cambiarFuente(fuente, activa));

  // La nota explica por qué está donde está. Es lo que evita volver a aprobar
  // dentro de un mes algo que se descartó por un motivo que ya no recuerdas.
  if (fuente.nota) {
    const nota = document.createElement('p');
    nota.className = 'fuente-nota';
    nota.textContent = fuente.nota;
    texto.appendChild(nota);
  }

  caja.append(texto, interruptor);
  return caja;
}

/**
 * Apagar o encender una fuente, y publicarlo en el momento.
 *
 * Antes se apuntaba el cambio y había que darle a un botón de publicar. Eran
 * dos pasos para una decisión que ya está tomada al pulsar el interruptor, y
 * el segundo era fácil de olvidar: la fuente se veía apagada en el móvil y la
 * edición de la madrugada seguía leyéndola.
 *
 * Si no se puede guardar, se deshace. Un interruptor que se queda apagado sin
 * haberse guardado miente sobre lo que va a pasar mañana.
 */
async function cambiarFuente(fuente, estabaActiva) {
  const nuevo = estabaActiva ? 'descartada' : 'aprobada';

  catalogo.cambiar(fuente.id, nuevo);
  refrescar();
  pintar();

  try {
    await servicio.guardarCatalogo(
      catalogo.comoFichero(),
      `${estabaActiva ? 'Fuera' : 'Vuelve'} ${fuente.nombre}`.slice(0, 72),
    );
    catalogo.darPorPublicado(await catalogo.recargar());
    avisar(`${fuente.nombre}: ${estabaActiva ? 'apagada' : 'encendida'}`);
  } catch (err) {
    catalogo.cambiar(fuente.id, fuente.estado);
    avisar('No se ha podido guardar: ' + err.message);

    if (!servicio.haySesion()) sesion.salir();
    mostrarSegunSesion();
  }

  refrescar();
  pintar();
}

function pintarResumen() {
  const activas = catalogo.fuentes().filter(f => f.estado === 'aprobada').length;

  // Quién eres va aquí y no en otro sitio porque este es el único renglón que
  // se repinta con todo, y antes lo borraba cada vez que se tocaba una fuente.
  const quien = sesion.identificada() ? `${sesion.nombre()} · ` : '';

  resumen.textContent = `${quien}${activas} fuentes activas`;
}



/** Enseña la pantalla que toque: identificarse, o el catálogo. */
function mostrarSegunSesion() {
  const dentro = sesion.identificada();

  cajaIdentificacion.hidden = dentro;
  cuerpo.hidden = !dentro;
  botonSalir.hidden = !dentro;

  if (!dentro) document.getElementById('resumenFuentes').textContent = 'Sin identificar';
}

/** Guarda la dirección y dice si el portero está ahí. */
async function comprobarServicio() {
  if (campoDireccion.value.trim()) servicio.guardarDireccion(campoDireccion.value);

  botonComprobarServicio.disabled = true;
  avisoServicio.textContent = 'Llamando al servicio…';

  const { motivo } = await servicio.comprobar();

  avisoServicio.textContent = motivo;
  botonComprobarServicio.disabled = false;
}

async function entrar() {
  if (campoDireccion.value.trim()) servicio.guardarDireccion(campoDireccion.value);

  botonEntrar.disabled = true;
  avisoIdentificacion.textContent = 'Comprobando…';

  // La dirección del portero se lee del repositorio al montar, pero eso tarda
  // unos milisegundos y aquí se llega antes si se escribe deprisa. Sin esta
  // espera, el primer intento contestaba «falta la dirección del servicio»
  // aunque estuviera publicada.
  if (!servicio.hayServicio()) await servicio.cargarDireccion();

  const { bien, motivo } = await sesion.identificar(campoUsuario.value.trim(), campoClave.value);

  avisoIdentificacion.textContent = motivo;
  botonEntrar.disabled = false;

  if (!bien) return;

  // La contraseña no se queda escrita en el campo ni un segundo de más.
  campoClave.value = '';
  await abrir();
}

/**
 * Comprobar una web y esperar el veredicto.
 *
 * La comprobación la hace una acción en GitHub, así que esto lanza y espera.
 * Se pregunta cada cinco segundos durante cinco minutos: encolar el trabajo,
 * arrancarlo, instalar las dependencias y mirar la web se va a minuto y medio
 * en un día tranquilo, y a bastante más si GitHub anda cargado.
 */
async function comprobarWeb(evento) {
  evento.preventDefault();

  const web = campoWeb.value.trim();
  if (!web) return;

  const desde = new Date().toISOString();
  botonComprobar.disabled = true;
  contar('Lanzando la comprobación…');

  try {
    await servicio.probarFuente({
      web,
      nombre: campoNombre.value.trim(),
      ambito: campoAmbito.value,
    });
  } catch (err) {
    contar(err.message, 'mal');
    botonComprobar.disabled = false;
    return;
  }

  contar('Comprobando la web… suele tardar un par de minutos.');

  for (let intento = 0; intento < 60; intento++) {
    await new Promise(r => setTimeout(r, 5000));

    const informe = await servicio.informe(desde, web);
    if (!informe) continue;

    contarInforme(informe);
    botonComprobar.disabled = false;

    // Si ha entrado, el catálogo de arriba ya no vale: se vuelve a leer de
    // verdad. Con «cargado = false» no bastaba: el catálogo se guarda en
    // memoria dentro del átomo, así que volvía a devolver el de antes y la
    // fuente recién añadida no aparecía en la lista.
    if (informe.sirve) {
      campoWeb.value = '';
      campoNombre.value = '';
      await catalogo.recargar();
      pintar();
    }
    return;
  }

  contar('La comprobación tarda más de cinco minutos. Mírala en la pestaña Actions de GitHub.', 'mal');
  botonComprobar.disabled = false;
}

function contar(texto, clase = '') {
  resultadoAlta.className = 'alta-resultado ' + clase;
  resultadoAlta.textContent = texto;
}

/** El informe, en una lista de frases: es lo que se lee, no un JSON. */
function contarInforme(informe) {
  resultadoAlta.className = 'alta-resultado ' + (informe.sirve ? 'bien' : 'mal');
  resultadoAlta.textContent = '';

  const titulo = document.createElement('b');
  titulo.textContent = (informe.sirve ? '✓ ' : '✗ ') + informe.titulo;
  resultadoAlta.appendChild(titulo);

  for (const linea of [...informe.problemas, ...informe.bien]) {
    const parrafo = document.createElement('p');
    parrafo.textContent = linea;
    resultadoAlta.appendChild(parrafo);
  }

  if (informe.feed) {
    const feed = document.createElement('p');
    feed.className = 'alta-feed';
    feed.textContent = informe.feed;
    resultadoAlta.appendChild(feed);
  }
}

export function montar() {
  // Se cuenta lo que hay en pantalla, no lo que dice el catálogo: es la
  // respuesta a «¿esta fuente me está aportando algo?».
  for (const pieza of estado.piezas) {
    const nombre = pieza.dataset.fuente;
    aportacion.set(nombre, (aportacion.get(nombre) ?? 0) + 1);
  }

  botonCerrar.addEventListener('click', cerrar);
  buscador.addEventListener('input', () => { if (cargado) pintar(); });

  botonEntrar.addEventListener('click', entrar);
  for (const campo of [campoUsuario, campoClave]) {
    campo.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') entrar();
    });
  }

  botonSalir.addEventListener('click', () => {
    sesion.salir();
    cargado = false;
    mostrarSegunSesion();
    avisar('Sesión cerrada en este dispositivo');
  });

  formularioAlta.addEventListener('submit', comprobarWeb);

  // La dirección del portero puede venir publicada en el repositorio; si no
  // está, el panel la pide una vez y se queda en el dispositivo.
  botonComprobarServicio.addEventListener('click', comprobarServicio);

  // La dirección se enseña siempre, no solo cuando falta. Estaba escondida en
  // cuanto había una guardada, y con una dirección mal escrita no había forma
  // de verla ni de cambiarla: solo un «no se ha podido hablar con el servicio»
  // que no decía dónde mirar.
  servicio.cargarDireccion().then(() => {
    campoDireccion.value = servicio.direccion();

    if (!servicio.hayServicio() && !sesion.identificada()) {
      avisoIdentificacion.textContent =
        'Falta montar el servicio que comprueba la contraseña. Está en la carpeta ' +
        'servicio/ del repositorio, con sus instrucciones. Cuando lo despliegues, ' +
        'pega aquí abajo la dirección que te dé.';
    }
  });

  mostrarSegunSesion();
}
