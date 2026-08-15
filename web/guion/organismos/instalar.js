// El botón de instalar, dentro de los ajustes.
//
// Existe porque el navegador esconde su propia opción en sitios distintos —en
// el escritorio va en la barra de direcciones, no en el menú— y solo la ofrece
// tras un rato de uso. Si la aplicación se puede instalar, que se vea.
//
// El botón está siempre, aunque el navegador todavía no nos haya dado permiso
// para instalar. Antes había un texto que decía "el navegador la ofrecerá en
// cuanto la uses un poco": informaba y no dejaba hacer nada, así que quien
// quería instalarla tenía que buscarse la vida por los menús. Ahora, cuando no
// se puede lanzar la instalación, el mismo botón explica dónde está la opción
// en ESE navegador.

const contenedor = document.getElementById('instalacion');

/** El navegador entrega aquí el aviso y hay que guardarlo para usarlo luego. */
let aviso = null;
let boton = null;

const ua = navigator.userAgent;
// iPadOS se presenta como Mac; los toques lo delatan.
const esApple = /iPad|iPhone|iPod/.test(ua)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esFirefox = /Firefox\//.test(ua);
const esAndroid = /Android/.test(ua);

export function montar() {
  if (yaInstalada()) {
    decir('Ya está instalada.');
    return;
  }

  pintarBoton();

  window.addEventListener('beforeinstallprompt', evento => {
    // Sin esto el navegador enseña su propio banner cuando le apetece.
    evento.preventDefault();
    aviso = evento;
  });

  window.addEventListener('appinstalled', () => {
    aviso = null;
    decir('Instalada. Ya la tienes con las demás aplicaciones.');
  });
}

function yaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function pintarBoton() {
  contenedor.textContent = '';

  boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'instalar';
  boton.textContent = 'Instalar la aplicación';
  boton.addEventListener('click', instalar);

  contenedor.appendChild(boton);
}

async function instalar() {
  // El camino bueno: el navegador ya nos dejó, así que sale su propio diálogo.
  if (aviso) {
    boton.disabled = true;
    aviso.prompt();
    const { outcome } = await aviso.userChoice;
    // El aviso solo sirve una vez. Si lo rechaza, el navegador dará otro más
    // adelante, así que el botón vuelve en lugar de quedarse muerto.
    aviso = null;
    boton.disabled = false;

    if (outcome === 'accepted') decir('Instalada.');
    else explicar('Sin instalar. Puedes volver a pulsar aquí cuando quieras.');
    return;
  }

  // Y si no, se dice dónde está la opción en este navegador. Es lo único que
  // se puede hacer: ningún navegador deja que una página se instale sola.
  explicar(dondeEsta());
}

/**
 * Dónde vive "instalar" en cada sitio.
 *
 * Safari no implementa la instalación desde la página y nunca la va a
 * implementar: en Apple se hace a mano desde compartir. Firefox de escritorio
 * directamente no instala aplicaciones web.
 */
function dondeEsta() {
  if (esApple) {
    return 'En iPhone y iPad se instala a mano: botón de compartir de Safari → '
      + 'Añadir a pantalla de inicio.';
  }

  if (esFirefox) {
    return esAndroid
      ? 'En Firefox: menú ⋮ → Añadir a la pantalla de inicio.'
      : 'Firefox de escritorio no instala aplicaciones web. Ábrela en Chrome o '
        + 'Edge y vuelve a pulsar aquí.';
  }

  if (esAndroid) {
    return 'Menú ⋮ del navegador → Instalar aplicación o Añadir a pantalla de inicio.';
  }

  return 'Mira el icono de instalar al final de la barra de direcciones. '
    + 'Si no está: menú ⋮ → Guardar y compartir → Instalar página como aplicación.';
}

/** El botón se queda, y debajo lo que haya que contar. */
function explicar(texto) {
  const nota = contenedor.querySelector('.instalacion-nota') ?? document.createElement('p');
  nota.className = 'instalacion-nota';
  nota.textContent = texto;
  contenedor.appendChild(nota);
}

/** Nada que pulsar: instalada o recién instalada. */
function decir(texto) {
  contenedor.textContent = texto;
}
