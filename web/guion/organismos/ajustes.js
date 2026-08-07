// Cómo se lee: tres modos, no tres tipografías.
//
// Antes eran tres fuentes casi iguales —Verdana, Georgia, Trebuchet— y la
// diferencia no se notaba. Ahora cada modo cambia varias cosas a la vez.
//
// Sobre la evidencia, para no vender lo que no es: las tipografías «para
// dislexia» tipo OpenDyslexic **no** han demostrado mejoras consistentes en
// estudios controlados. Lo que sí aparece de forma repetida es que ayuda
// separar más las letras y las palabras, agrandar el texto y acortar la línea.
// Por eso el modo Enfoque cambia el espaciado y el tamaño, y la fuente es lo
// de menos.
//
// La lectura biónica tampoco tiene respaldo claro en los estudios. Está aquí
// como preferencia, que para eso es un ajuste.

const MODOS = [
  {
    id: 'normal',
    nombre: 'Aa',
    nota: 'normal',
    pila: 'Verdana, Geneva, sans-serif',
    escala: 1,
    letras: '0.004em',
    palabras: '0.16em',
    linea: 1.66,
    ancho: '560px',
    bionica: false,
  },
  {
    id: 'enfoque',
    nombre: 'Aa',
    nota: 'enfoque',
    // La misma familia: el cambio está en el espaciado, no en el dibujo.
    pila: '"Dislexia", Verdana, Tahoma, sans-serif',
    escala: 1.12,
    // Letras y palabras más separadas, que es la parte con respaldo real.
    letras: '0.055em',
    palabras: '0.34em',
    linea: 1.95,
    // Línea más corta: menos saltos en falso al volver al margen.
    ancho: '440px',
    bionica: false,
  },
  {
    id: 'bionica',
    nombre: 'Aa',
    nota: 'biónica',
    pila: 'Verdana, Geneva, sans-serif',
    escala: 1.06,
    letras: '0.02em',
    palabras: '0.24em',
    linea: 1.8,
    ancho: '500px',
    bionica: true,
  },
];

const RECUERDO = 'ms-lectura';
const contenedor = document.getElementById('letras');

function aplicar(id) {
  const modo = MODOS.find(m => m.id === id) || MODOS[0];
  const raiz = document.documentElement;

  raiz.style.setProperty('--letra', modo.pila);
  raiz.style.setProperty('--escala-letra', String(modo.escala));
  raiz.style.setProperty('--espaciado-letras', modo.letras);
  raiz.style.setProperty('--espaciado-palabras', modo.palabras);
  raiz.style.setProperty('--altura-linea', String(modo.linea));
  raiz.style.setProperty('--ancho-lectura', modo.ancho);

  // El anclaje ya está en el marcado; esto solo decide si se ve.
  raiz.dataset.lectura = modo.id;

  for (const boton of contenedor.children) {
    const esta = boton.dataset.id === modo.id;
    boton.classList.toggle('elegida', esta);
    boton.setAttribute('aria-pressed', String(esta));
  }

  try { localStorage.setItem(RECUERDO, modo.id); } catch (err) { /* sin memoria, da igual */ }
}

export function montar() {
  for (const modo of MODOS) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'letra';
    boton.dataset.id = modo.id;
    boton.style.fontFamily = modo.pila;
    boton.setAttribute('aria-pressed', 'false');

    // La muestra se pinta con el modo que representa, incluida la negrita del
    // anclaje: se elige viendo el resultado, no leyendo el nombre.
    const muestra = document.createElement('strong');
    if (modo.bionica) {
      const b = document.createElement('b');
      b.textContent = 'A';
      muestra.append(b, 'a');
    } else {
      muestra.textContent = modo.nombre;
      if (modo.id === 'enfoque') muestra.style.letterSpacing = modo.letras;
    }

    const nota = document.createElement('small');
    nota.textContent = modo.nota;

    boton.append(muestra, nota);
    boton.addEventListener('click', () => aplicar(modo.id));
    contenedor.appendChild(boton);
  }

  let guardado = MODOS[0].id;
  try { guardado = localStorage.getItem(RECUERDO) || guardado; } catch (err) { /* nada */ }
  aplicar(guardado);
}
