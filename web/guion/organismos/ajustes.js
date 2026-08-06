// Tipo de letra, dentro del índice.
//
// Tres caras distintas, presentes en móvil y escritorio. La escala compensa
// que las serif se ven más pequeñas al mismo tamaño.

const LETRAS = [
  { id: 'verdana',   nombre: 'Aa', nota: 'ancha',    pila: 'Verdana, Geneva, sans-serif',        escala: 1    },
  { id: 'georgia',   nombre: 'Aa', nota: 'serif',    pila: 'Georgia, "Times New Roman", serif',  escala: 1.09 },
  { id: 'trebuchet', nombre: 'Aa', nota: 'estrecha', pila: '"Trebuchet MS", Tahoma, sans-serif', escala: 1.06 },
];

const RECUERDO = 'ms-letra';
const contenedor = document.getElementById('letras');

function aplicar(id) {
  const elegida = LETRAS.find(l => l.id === id) || LETRAS[0];
  document.documentElement.style.setProperty('--letra', elegida.pila);
  document.documentElement.style.setProperty('--escala-letra', String(elegida.escala));

  for (const boton of contenedor.children) {
    const esta = boton.dataset.id === elegida.id;
    boton.classList.toggle('elegida', esta);
    boton.setAttribute('aria-pressed', String(esta));
  }

  try { localStorage.setItem(RECUERDO, elegida.id); } catch (err) { /* sin memoria, da igual */ }
}

export function montar() {
  for (const letra of LETRAS) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'letra';
    boton.dataset.id = letra.id;
    boton.style.fontFamily = letra.pila;
    boton.setAttribute('aria-pressed', 'false');

    const muestra = document.createElement('strong');
    muestra.textContent = letra.nombre;
    const nota = document.createElement('small');
    nota.textContent = letra.nota;

    boton.append(muestra, nota);
    boton.addEventListener('click', () => aplicar(letra.id));
    contenedor.appendChild(boton);
  }

  let guardada = LETRAS[0].id;
  try { guardada = localStorage.getItem(RECUERDO) || guardada; } catch (err) { /* nada */ }
  aplicar(guardada);
}
