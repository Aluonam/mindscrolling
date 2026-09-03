// Dibuja una pieza de la edición.
//
// Lo que el resto del lector necesita de la pieza va en data-*: el ámbito lo
// usa el CSS para teñirla, y los demás los leen el índice, el enviar y la
// ampliación sin volver a los datos.

import { nombreDe } from '../atomos/ambitos.js';
import { trocear } from '../atomos/palabras.js';
import { segundosDeLectura } from '../atomos/texto.js';

export function dibujar(dato) {
  const articulo = document.createElement('article');
  articulo.className = 'pieza';
  articulo.dataset.ambito = dato.fuente.ambito;
  articulo.dataset.fuente = dato.fuente.nombre;
  articulo.dataset.enlace = dato.enlace;
  articulo.dataset.titulo = dato.titulo || '';
  articulo.dataset.amplia = dato.resumenOriginal || '';

  articulo.append(
    procedencia(dato),
    destilado(dato),
    pie(dato),
    pausa(),
  );
  return articulo;
}

function procedencia(dato) {
  const caja = document.createElement('div');
  caja.className = 'procedencia';

  const ambito = document.createElement('span');
  ambito.className = 'ambito';
  ambito.textContent = nombreDe(dato.fuente.ambito);

  const barra = document.createElement('span');
  barra.className = 'separador';
  barra.textContent = '/';

  const fuente = document.createElement('span');
  fuente.textContent = dato.fuente.nombre;

  caja.append(ambito, barra, fuente);

  // Una pieza heredada de otro día lo dice aquí mismo. No es un aviso ni un
  // error: es que no todo lo que se lee hoy se escribió hoy, y quien lee
  // merece distinguirlo de un vistazo sin que le grite.
  if (dato.deOtroDia) {
    const cuando = document.createElement('span');
    cuando.className = 'deotrodia';
    cuando.textContent = enPalabras(dato.deOtroDia);
    caja.append(cuando);
  }

  return caja;
}

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

/**
 * «2026-09-01» se lee «1 sep». Y si fue ayer, se dice «ayer», que es como lo
 * diría una persona.
 *
 * La fecha se parte a mano en vez de pasarla por `new Date`: una cadena
 * «2026-09-01» la interpreta el navegador como UTC y en España sale el 31 de
 * agosto por la noche.
 */
function enPalabras(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  if (!anio || !mes || !dia) return fecha;

  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (anio === ayer.getFullYear() && mes === ayer.getMonth() + 1 && dia === ayer.getDate()) {
    return 'de ayer';
  }

  return `del ${dia} ${MESES[mes - 1] ?? ''}`.trim();
}

function destilado(dato) {
  const parrafo = document.createElement('p');
  parrafo.className = 'destilado';
  trocear(parrafo, dato.destilado);
  return parrafo;
}

function pie(dato) {
  const caja = document.createElement('div');
  caja.className = 'pie';

  const tiempo = document.createElement('span');
  tiempo.textContent = segundosDeLectura(dato.destilado.texto) + ' s de lectura';

  const punto = document.createElement('span');
  punto.className = 'separador';
  punto.textContent = '·';

  // Se comparte el original, nunca el destilado (decisión 12).
  const enlace = document.createElement('a');
  enlace.className = 'original';
  enlace.href = dato.enlace;
  enlace.target = '_blank';
  enlace.rel = 'noopener';
  enlace.textContent = 'Abrir el original';

  caja.append(tiempo, punto, enlace);
  return caja;
}

function pausa() {
  const caja = document.createElement('div');
  caja.className = 'pausa';
  caja.textContent = 'En pausa · toca para seguir';
  return caja;
}
