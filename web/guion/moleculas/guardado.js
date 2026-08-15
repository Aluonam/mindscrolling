// Una línea de la lista de guardados: punto del ámbito, fuente, título y quitar.
//
// La fila del índice es un botón que lleva a una pieza del carril. Ésta es un
// enlace que sale de la aplicación, porque lo guardado es el trabajo original y
// no nuestro destilado (decisión 12). Por eso son dos moléculas y no una con un
// parámetro.

export function crearGuardado(guardado, alQuitar) {
  const linea = document.createElement('div');
  linea.className = 'guardado';
  if (guardado.ambito) linea.dataset.ambito = guardado.ambito;

  const punto = document.createElement('span');
  punto.className = 'punto';

  const enlace = document.createElement('a');
  enlace.className = 'guardado-texto';
  enlace.href = guardado.enlace;
  enlace.target = '_blank';
  enlace.rel = 'noopener';

  const fuente = document.createElement('span');
  fuente.className = 'fuente';
  fuente.textContent = guardado.fuente || 'Sin fuente';

  const titulo = document.createElement('span');
  titulo.className = 'titulo';
  // Un guardado sin título no puede quedarse en blanco: el enlace es lo único
  // que siempre está, y peor leído es mejor que nada que pulsar.
  titulo.textContent = guardado.titulo || guardado.enlace;

  enlace.append(fuente, titulo);

  const quitar = document.createElement('button');
  quitar.className = 'quitar';
  quitar.type = 'button';
  quitar.textContent = '×';
  quitar.setAttribute('aria-label', 'Quitar de guardados');
  quitar.addEventListener('click', alQuitar);

  linea.append(punto, enlace, quitar);
  return linea;
}
