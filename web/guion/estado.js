// Lo que varios organismos necesitan saber a la vez: qué pieza se está
// leyendo y cuáles se han terminado de leer.
//
// Existe para que no se conozcan entre ellos. El carril no llama al índice
// para que se repinte: cambia el estado y avisa. Quien quiera enterarse, se
// suscribe.

const oyentes = new Set();

export const estado = {
  /** Los <article> del carril, en el orden en que se ven. */
  piezas: [],
  /** Índice de la pieza en pantalla. */
  actual: 0,
  /** Índices cuyo destilado ha terminado de revelarse. */
  leidas: new Set(),
};

export function alCambiar(oyente) {
  oyentes.add(oyente);
}

export function cambio() {
  for (const oyente of oyentes) oyente();
}

/** Leída = destilado terminado. La señal que de verdad dice algo (decisión 9). */
export function marcarLeida(indice) {
  if (estado.leidas.has(indice)) return;
  estado.leidas.add(indice);
  cambio();
}
