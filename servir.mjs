// Abre el lector en el navegador para mirarlo mientras se trabaja.
//
// Hace falta porque `web/index.html` pide la edición con fetch, y un fichero
// abierto a doble clic (file://) no puede pedir nada: el navegador lo bloquea.
// Con esto se sirve por http y funciona igual que funcionará en Pages.
//
// No es infraestructura del proyecto: no lo usa nadie más que quien programa.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath y no .pathname: en Windows, .pathname devuelve «/C:/…», con
// una barra delante que convierte cualquier join posterior en una ruta que no
// existe.
const raiz = fileURLToPath(new URL('.', import.meta.url));
const puerto = Number(process.env.PUERTO) || 8731;

// El tipo importa: un CSS servido como texto plano el navegador lo ignora,
// y la página sale sin estilos sin decir por qué.
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

createServer(async (peticion, respuesta) => {
  const pedido = decodeURIComponent(peticion.url.split('?')[0]);
  const ruta = join(raiz, pedido === '/' ? '/web/index.html' : pedido);

  try {
    const contenido = await readFile(ruta);
    respuesta.writeHead(200, {
      'content-type': tipos[extname(ruta)] || 'application/octet-stream',
      // Sin caché: se recarga y se ve el cambio, que es de lo que se trata.
      'cache-control': 'no-store',
    });
    respuesta.end(contenido);
  } catch {
    respuesta.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    respuesta.end('Aquí no hay nada');
  }
}).listen(puerto, () => {
  console.log(`El lector está en http://localhost:${puerto}`);
});
