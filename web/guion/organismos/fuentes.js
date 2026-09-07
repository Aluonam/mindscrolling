// El panel de fuentes: de dónde sale lo que lees, y qué entra y qué no.
//
// No aparece por ninguna parte a la vista. Se abre pulsando cinco veces
// seguidas el sello de la cabecera, o con `#fuentes` en la dirección. Es una
// aplicación pública y el panel se ve si alguien lo busca; lo que no puede
// hacer sin credencial es cambiar nada de lo publicado.
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
import * as repositorio from '../atomos/repositorio.js';

const panel = document.getElementById('fuentes');
const lista = document.getElementById('listaFuentes');
const buscador = document.getElementById('buscarFuente');
const resumen = document.getElementById('resumenFuentes');
const botonCerrar = document.getElementById('cerrarFuentes');
const botonCopiar = document.getElementById('copiarCatalogo');
const botonPublicar = document.getElementById('publicarCatalogo');
const botonOlvidar = document.getElementById('olvidarCambios');
const campoCredencial = document.getElementById('credencial');

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
  interruptor.addEventListener('click', () => {
    catalogo.cambiar(fuente.id, activa ? 'descartada' : 'aprobada');
    refrescar();
    pintar();
  });

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

function pintarResumen() {
  const cambios = catalogo.cuantosCambios();
  const activas = catalogo.fuentes().filter(f => f.estado === 'aprobada').length;

  resumen.textContent = cambios === 0
    ? `${activas} fuentes activas. Sin cambios pendientes.`
    : `${activas} fuentes activas · ${cambios} ${cambios === 1 ? 'cambio' : 'cambios'} sin publicar: ya se notan aquí, pero la edición de mañana no los verá hasta publicarlos.`;

  botonPublicar.disabled = cambios === 0;
  botonCopiar.disabled = cambios === 0;
  botonOlvidar.hidden = cambios === 0;
  botonPublicar.textContent = repositorio.hayCredencial() ? 'Publicar en GitHub' : 'Publicar (falta credencial)';
}

async function copiar() {
  try {
    await navigator.clipboard.writeText(catalogo.comoFichero());
    avisar('Catálogo copiado · pégalo en config/fuentes.json');
  } catch (err) {
    avisar('No se ha podido copiar');
  }
}

async function publicar() {
  if (!repositorio.hayCredencial()) {
    avisar('Pega abajo una credencial de GitHub con permiso de escritura');
    campoCredencial.focus();
    return;
  }

  const cambiadas = catalogo.fuentes().filter(f => f.cambiada).map(f => f.nombre);
  botonPublicar.disabled = true;
  botonPublicar.textContent = 'Publicando…';

  try {
    await repositorio.publicar(
      catalogo.comoFichero(),
      `Catálogo: ${cambiadas.join(', ')}`.slice(0, 72),
    );
    // Se vuelve a leer lo que ha quedado arriba en vez de dar por hecho que es
    // lo que mandamos: si algo se ha quedado por el camino, mejor verlo.
    catalogo.darPorPublicado(await (await fetch('../config/fuentes.json', { cache: 'no-store' })).json());
    avisar('Publicado · la edición de mañana ya lo tendrá en cuenta');
  } catch (err) {
    avisar(err.message);
  }

  pintar();
}

/**
 * Cinco toques en el sello. Ni menos —se abriría sin querer— ni un gesto que
 * haya que recordar. Se olvida la cuenta si pasan dos segundos sin tocar.
 */
function escucharLaEntrada() {
  const sello = document.querySelector('.cabecera .sello');
  if (!sello) return;

  let toques = 0;
  let olvido = null;

  sello.style.pointerEvents = 'auto';
  sello.addEventListener('click', () => {
    toques++;
    clearTimeout(olvido);
    olvido = setTimeout(() => { toques = 0; }, 2000);

    if (toques >= 5) {
      toques = 0;
      abrir();
    }
  });

  if (location.hash === '#fuentes') abrir();
}

export function montar() {
  // Se cuenta lo que hay en pantalla, no lo que dice el catálogo: es la
  // respuesta a «¿esta fuente me está aportando algo?».
  for (const pieza of estado.piezas) {
    const nombre = pieza.dataset.fuente;
    aportacion.set(nombre, (aportacion.get(nombre) ?? 0) + 1);
  }

  botonCerrar.addEventListener('click', cerrar);
  botonCopiar.addEventListener('click', copiar);
  botonPublicar.addEventListener('click', publicar);
  botonOlvidar.addEventListener('click', () => {
    catalogo.olvidarCambios();
    refrescar();
    pintar();
    avisar('Cambios locales olvidados');
  });

  buscador.addEventListener('input', () => { if (cargado) pintar(); });

  campoCredencial.value = repositorio.credencial();
  campoCredencial.addEventListener('change', () => {
    repositorio.guardarCredencial(campoCredencial.value);
    pintarResumen();
    avisar(campoCredencial.value ? 'Credencial guardada en este dispositivo' : 'Credencial borrada');
  });

  escucharLaEntrada();
}
