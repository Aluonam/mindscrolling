// La página. Carga la edición, monta los organismos y los conecta entre sí.
//
// Único acoplamiento con el resto del proyecto: el formato de
// `ediciones/ultima.json` (fecha + lista de piezas).

import * as carril from './organismos/carril.js';
import * as cierre from './organismos/cierre.js';
import * as cabecera from './organismos/cabecera.js';
import * as indice from './organismos/indice.js';
import * as detalle from './organismos/detalle.js';
import * as valoracion from './organismos/valoracion.js';
import * as ajustes from './organismos/ajustes.js';
import * as ondas from './organismos/ondas.js';
import * as instalar from './organismos/instalar.js';
import * as velo from './moleculas/velo.js';
import { guardarParaSinConexion } from './atomos/sinConexion.js';
import { avisar } from './atomos/aviso.js';
import { fechaLegible } from './atomos/texto.js';

async function cargarEdicion() {
  try {
    const respuesta = await fetch('../ediciones/ultima.json', { cache: 'no-store' });
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch (err) {
    // Sin red o sin fichero: se trata igual que sin edición.
    return null;
  }
}

function sinEdicion() {
  const caja = document.createElement('div');
  caja.className = 'vacio';

  const titulo = document.createElement('b');
  titulo.textContent = 'Todavía no hay ninguna edición';

  const nota = document.createElement('span');
  nota.append('Cada madrugada se publica una nueva. Para generarla ahora mismo, ejecuta ');
  const orden = document.createElement('code');
  orden.textContent = 'npm run edicion';
  nota.append(orden, '.');

  caja.append(titulo, nota);
  document.getElementById('carril').appendChild(caja);
}

/**
 * Una edición vieja significa que la acción de la madrugada no publicó.
 *
 * El listón está en dos días y no en uno a propósito: la fecha se escribe en
 * horario universal y aquí se compara con la del teléfono, así que una edición
 * recién salida puede parecer de ayer durante unas horas. Dos días ya no admite
 * esa duda, y el aviso no se gasta en falsas alarmas.
 */
function avisarSiNoEsDeHoy(edicion) {
  const publicada = Date.parse(`${edicion.fecha}T00:00:00Z`);
  if (Number.isNaN(publicada)) return;

  const dias = Math.floor((Date.now() - publicada) / 86400000);
  if (dias >= 2) {
    avisar(`Estás leyendo la edición del ${fechaLegible(edicion.fecha)}: la de hoy no ha llegado`);
  }
}

guardarParaSinConexion();

const edicion = await cargarEdicion();

if (!edicion?.piezas?.length) {
  sinEdicion();
} else {
  carril.montar(edicion);
  cierre.montar(edicion, { alVolver: () => carril.irA(0) });
  cabecera.montar(edicion);
  indice.montar();
  detalle.montar();
  valoracion.montar();
  ajustes.montar();
  ondas.montar();
  instalar.montar();

  // Cerrar paneles: el velo cierra los dos, Escape cierra el de encima.
  velo.alPulsar(() => { detalle.cerrar(); indice.cerrar(); });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (detalle.estaAbierto()) detalle.cerrar();
    else if (indice.estaAbierto()) indice.cerrar();
  });

  carril.arrancar();
  avisarSiNoEsDeHoy(edicion);
}
