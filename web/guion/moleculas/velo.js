// La capa oscura de detrás de los paneles.
//
// La comparten el índice y la ampliación, y pueden estar los dos abiertos a
// la vez. Por eso lleva la cuenta de quién lo tiene abierto en vez de un
// simple sí/no: el primero que cierra no debe llevárselo.

const velo = document.getElementById('velo');
const abiertos = new Set();
const oyentes = [];

function pintar() {
  velo.classList.toggle('abierto', abiertos.size > 0);
}

export function abrir(quien) {
  abiertos.add(quien);
  pintar();
}

export function cerrar(quien) {
  abiertos.delete(quien);
  pintar();
}

export function alPulsar(oyente) {
  oyentes.push(oyente);
}

velo.addEventListener('click', () => {
  for (const oyente of oyentes) oyente();
});
