// Servidor estático para ver el lector en local.
//
// Hace falta porque el lector pide la edición con fetch y el navegador lo
// bloquea desde file://. No es infraestructura del proyecto.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath y no .pathname: en Windows .pathname devuelve «/C:/…» y el
// join posterior da una ruta inexistente.
const raiz = fileURLToPath(new URL('.', import.meta.url));
const puerto = Number(process.env.PUERTO) || 8731;

// El navegador ignora un CSS servido como texto plano, y no avisa.
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
      // Sin caché: recargar basta para ver el cambio.
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
