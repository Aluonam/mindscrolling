// Mensaje flotante y efímero. Lo usan enviar y las ondas.

const aviso = document.getElementById('aviso');
let temporizador = null;

export function avisar(texto) {
  aviso.textContent = texto;
  aviso.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => aviso.classList.remove('visible'), 2600);
}
