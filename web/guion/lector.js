// La página. Carga la edición, monta los organismos y los conecta entre sí.
//
// Único acoplamiento con el resto del proyecto: el formato de
// `ediciones/ultima.json` (fecha + lista de piezas).

import * as carril from './organismos/carril.js';
import * as cabecera from './organismos/cabecera.js';
import * as indice from './organismos/indice.js';
import * as detalle from './organismos/detalle.js';
import * as valoracion from './organismos/valoracion.js';
import * as ajustes from './organismos/ajustes.js';
import * as ondas from './organismos/ondas.js';
import * as velo from './moleculas/velo.js';

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

const edicion = await cargarEdicion();

if (!edicion?.piezas?.length) {
  sinEdicion();
} else {
  carril.montar(edicion);
  cabecera.montar(edicion);
  indice.montar();
  detalle.montar();
  valoracion.montar();
  ajustes.montar();
  ondas.montar();

  // Cerrar paneles: el velo cierra los dos, Escape cierra el de encima.
  velo.alPulsar(() => { detalle.cerrar(); indice.cerrar(); });

  document.addEventListener('keydown', ev => {
    if (ev.key !== 'Escape') return;
    if (detalle.estaAbierto()) detalle.cerrar();
    else if (indice.estaAbierto()) indice.cerrar();
  });

  carril.arrancar();
}
