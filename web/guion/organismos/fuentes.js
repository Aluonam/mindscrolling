// El catálogo de fuentes dentro del panel: qué se lee y qué ha aportado hoy.
//
// Se carga tarde a propósito. `config/fuentes.json` pesa unos 47 kB y no hace
// falta para leer la edición, así que no se pide hasta que abres la sección.
// Quien nunca la abra no lo descarga nunca.

import { nombreDe } from '../atomos/ambitos.js';

const seccion = document.getElementById('fuentes');
const cuerpo  = document.getElementById('fuentesCuerpo');
const contador = document.getElementById('contadorFuentes');

/**
 * De estado del catálogo a algo que se entienda sin haber leído el código.
 *
 * El orden importa: es el que se sigue al pintar, de lo que más aporta a lo
 * que no aporta nada.
 */
const ESTADOS = [
  ['aprobada',   'aprobadas',
    'Se leen cada madrugada'],
  ['candidata',  'candidatas',
    'Están en el catálogo pero todavía no se leen. Casi todas esperan a que alguien les encuentre un feed'],
  ['cuarentena', 'en cuarentena',
    'Bloquearon al robot o dejaron de responder. Se saltan solas'],
  ['descartada', 'descartadas',
    'Se miraron y se dejaron pasar'],
];

let cargado = false;

/** Cuántas piezas ha puesto cada fuente en la edición de hoy. */
function contarAportes(edicion) {
  const cuenta = new Map();
  for (const pieza of edicion.piezas) {
    const nombre = pieza.fuente?.nombre;
    if (nombre) cuenta.set(nombre, (cuenta.get(nombre) || 0) + 1);
  }
  return cuenta;
}

function fila(fuente, aportes) {
  const caja = document.createElement('div');
  caja.className = 'fuente';
  caja.dataset.ambito = fuente.ambito;

  const nombre = document.createElement('b');
  nombre.textContent = fuente.nombre;

  const detalle = document.createElement('small');
  const via = fuente.rss ? 'RSS' : fuente.consulta ? 'Europe PMC' : 'sin forma de leerla';
  const hoy = aportes.get(fuente.nombre) || 0;

  detalle.textContent = [
    nombreDe(fuente.ambito),
    via,
    // Solo se cuenta lo de hoy porque es lo único que tenemos: la edición
    // anterior se sobrescribe. Un histórico haría falta para decir «lleva un
    // mes sin aportar nada», que es la pregunta útil de verdad.
    fuente.estado === 'aprobada' ? (hoy ? `${hoy} hoy` : 'nada hoy') : null,
  ].filter(Boolean).join(' · ');

  caja.append(nombre, detalle);

  if (fuente.web) {
    const enlace = document.createElement('a');
    enlace.href = fuente.web;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    enlace.textContent = '↗';
    enlace.setAttribute('aria-label', `Abrir ${fuente.nombre}`);
    caja.append(enlace);
  }

  return caja;
}

function pintar(catalogo, edicion) {
  const aportes = contarAportes(edicion);
  cuerpo.replaceChildren();

  for (const [estado, etiqueta, explicacion] of ESTADOS) {
    const delEstado = catalogo.fuentes.filter(f => f.estado === estado);
    if (!delEstado.length) continue;

    // La etiqueta viene escrita y no se pluraliza con una «s»: eso daba
    // «8 cuarentenas», que no es español.
    const titulo = document.createElement('div');
    titulo.className = 'fuentes-grupo';
    titulo.append(`${delEstado.length} ${etiqueta}`);

    const nota = document.createElement('small');
    nota.textContent = explicacion;
    titulo.append(nota);

    cuerpo.append(titulo);

    for (const fuente of delEstado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))) {
      cuerpo.append(fila(fuente, aportes));
    }
  }
}

function error(mensaje) {
  cuerpo.replaceChildren();
  const aviso = document.createElement('p');
  aviso.className = 'fuentes-error';
  aviso.textContent = mensaje;
  cuerpo.append(aviso);
}

export function montar(edicion) {
  // Una sola vez, y solo al abrir: el catálogo no cambia mientras lees.
  seccion.addEventListener('toggle', async () => {
    if (!seccion.open || cargado) return;
    cargado = true;

    try {
      const respuesta = await fetch('../config/fuentes.json', { cache: 'no-store' });
      if (!respuesta.ok) throw new Error(String(respuesta.status));

      const catalogo = await respuesta.json();
      pintar(catalogo, edicion);
      contador.textContent = catalogo.fuentes.length;
    } catch (err) {
      // Sin conexión y sin catálogo guardado. No es grave: esto es información
      // de fondo, y la edición se sigue leyendo igual.
      cargado = false;
      error('No se ha podido cargar el catálogo. Vuelve a abrirlo con conexión.');
    }
  });
}
