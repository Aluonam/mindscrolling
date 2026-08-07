// El botón de instalar, dentro de los ajustes.
//
// Existe porque el navegador esconde su propia opción en sitios distintos —en
// el escritorio va en la barra de direcciones, no en el menú— y solo la ofrece
// tras un rato de uso. Si la aplicación se puede instalar, que se vea.

const contenedor = document.getElementById('instalacion');

/** El navegador entrega aquí el aviso y hay que guardarlo para usarlo luego. */
let aviso = null;

export function montar() {
  // Safari no lo implementa: allí se instala desde el botón de compartir, y no
  // hay forma de lanzarlo desde la página. Se dice, en vez de callar.
  const esApple = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (yaInstalada()) {
    contenedor.textContent = 'Ya está instalada.';
    return;
  }

  if (esApple) {
    contenedor.textContent = 'Para instalarla: botón de compartir → Añadir a pantalla de inicio.';
    return;
  }

  contenedor.textContent = 'El navegador la ofrecerá en cuanto la uses un poco.';

  window.addEventListener('beforeinstallprompt', evento => {
    // Sin esto el navegador enseña su propio banner cuando le apetece.
    evento.preventDefault();
    aviso = evento;
    mostrarBoton();
  });

  window.addEventListener('appinstalled', () => {
    aviso = null;
    contenedor.textContent = 'Instalada. Ya la tienes en la pantalla de inicio.';
  });
}

function yaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function mostrarBoton() {
  contenedor.textContent = '';

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'instalar';
  boton.textContent = 'Añadir a la pantalla de inicio';

  boton.addEventListener('click', async () => {
    if (!aviso) return;
    boton.disabled = true;
    aviso.prompt();
    const { outcome } = await aviso.userChoice;
    // El aviso solo sirve una vez; si lo rechaza, el navegador dará otro.
    aviso = null;
    contenedor.textContent = outcome === 'accepted'
      ? 'Instalada.'
      : 'Sin instalar. Puedes hacerlo más tarde desde el menú del navegador.';
  });

  contenedor.appendChild(boton);
}
