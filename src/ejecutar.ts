// El único sitio donde se decide QUIÉN cumple cada puerto.
//
// Fíjate en que el dominio no aparece por ninguna parte eligiendo herramientas.
// Aquí se enchufan las piezas concretas y se lanza el ciclo. Cambiar de RSS a
// arXiv, o de Claude a Ollama, se hace en este fichero y en ningún otro.

import { readFile } from 'node:fs/promises';
import { construirEdicion } from './dominio/construirEdicion.ts';
import type {
  Cupos, Edicion, FuenteCatalogada, Hallazgo, Interes, PiezaPublicada,
} from './dominio/tipos.ts';
import { BuscadorRss } from './infraestructura/buscadorRss.ts';
import { ResumidorClaude } from './infraestructura/resumidorClaude.ts';
import { PublicadorFichero } from './infraestructura/publicadorFichero.ts';

type Configuracion = {
  cupos: Cupos;
  fuentes: FuenteCatalogada[];
  intereses: Interes[];
};

async function main() {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);

  const config: Configuracion = JSON.parse(
    await readFile(new URL('../config/fuentes.json', import.meta.url), 'utf8'),
  );

  // Solo se lee lo aprobado. Las candidatas están en el catálogo esperando a
  // que alguien les escriba un adaptador; las de cuarentena, a que su web
  // vuelva a existir. Ninguna de las dos aporta piezas hoy.
  //
  // La comprobación del RSS no es paranoia: una fuente aprobada sin dirección
  // sería un fallo silencioso — no daría error, solo dejaría de aparecer.
  const aprobadas = config.fuentes.filter(f => f.estado === 'aprobada');

  const sinDireccion = aprobadas.filter(f => !f.rss);
  if (sinDireccion.length > 0) {
    throw new Error(
      'Hay fuentes aprobadas sin dirección de RSS: ' +
        sinDireccion.map(f => f.id).join(', ') +
        '. O se les pone dirección, o vuelven a candidatas.',
    );
  }

  const direcciones = Object.fromEntries(aprobadas.map(f => [f.id, f.rss!]));
  const fuentes = aprobadas;

  const buscador = new BuscadorRss(direcciones);
  const resumidor = new ResumidorClaude();
  const publicador = new PublicadorFichero(new URL('../ediciones/', import.meta.url).pathname);

  // 1. Recolectar. Las fuentes se consultan a la vez, no en fila.
  console.log(`Leyendo ${fuentes.length} fuentes...`);
  const porFuente = await Promise.all(fuentes.map(f => buscador.buscar(f)));
  const hallazgos: Hallazgo[] = porFuente.flat();
  console.log(`  ${hallazgos.length} hallazgos en bruto`);

  // 2. Decidir. Todo esto es dominio puro: sin red, sin ficheros.
  const finalistas = construirEdicion(hallazgos, config.intereses, config.cupos, ahora);
  console.log(`  ${finalistas.length} finalistas tras deduplicar, puntuar y repartir cupos`);

  if (finalistas.length === 0) {
    console.log('Sin piezas hoy. No se publica nada.');
    return;
  }

  // 3. Resumir. La operación cara, al final y solo sobre lo que sobrevivió.
  console.log('Escribiendo destilados...');
  const piezas: PiezaPublicada[] = [];
  for (const pieza of finalistas) {
    try {
      piezas.push({ ...pieza, destilado: await resumidor.destilar(pieza) });
      console.log(`  ✓ ${pieza.titulo.slice(0, 60)}`);
    } catch (error) {
      // Una pieza que falla no tumba la edición.
      console.warn(`  ✗ ${pieza.titulo.slice(0, 60)} — ${(error as Error).message}`);
    }
  }

  // 4. Publicar.
  const edicion: Edicion = { fecha, piezas };
  await publicador.publicar(edicion);
  console.log(`\nEdición del ${fecha} publicada con ${piezas.length} piezas.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
