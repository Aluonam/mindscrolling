// Una pieza dentro del índice: punto del ámbito, fuente, entradilla y el visto
// de leída.

import { entradilla } from '../atomos/texto.js';

export function crearFila(pieza, alPulsar) {
  const fila = document.createElement('button');
  fila.type = 'button';
  fila.className = 'fila';
  fila.dataset.ambito = pieza.dataset.ambito;

  const punto = document.createElement('span');
  punto.className = 'punto';

  const fuente = document.createElement('span');
  fuente.className = 'fuente';
  fuente.textContent = pieza.dataset.fuente;

  const avance = document.createElement('span');
  avance.className = 'avance';
  avance.textContent = entradilla(pieza.querySelector('.destilado').textContent);

  const texto = document.createElement('span');
  texto.append(fuente, avance);

  const marca = document.createElement('span');
  marca.className = 'marca-fila';

  fila.append(punto, texto, marca);
  fila.addEventListener('click', alPulsar);
  return fila;
}

export function pintarFila(fila, { actual, leida }) {
  fila.classList.toggle('actual', actual);
  fila.classList.toggle('leida', leida);
  fila.querySelector('.marca-fila').textContent = leida ? '✓' : '';
}
