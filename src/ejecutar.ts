// El único sitio donde se decide QUIÉN cumple cada puerto.
//
// Fíjate en que el dominio no aparece por ninguna parte eligiendo herramientas.
// Aquí se enchufan las piezas concretas y se lanza el ciclo. Cambiar de RSS a
// arXiv, o de Claude a Ollama, se hace en este fichero y en ningún otro.

import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { construirEdicion } from './dominio/construirEdicion.ts';
import type {
  Cupos, Edicion, FuenteCatalogada, Hallazgo, Interes, PiezaPublicada,
} from './dominio/tipos.ts';
import { BuscadorRss } from './infraestructura/buscadorRss.ts';
import { BuscadorEuropePmc } from './infraestructura/buscadorEuropePmc.ts';
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
  const aprobadas = config.fuentes.filter(f => f.estado === 'aprobada');

  // Cada fuente aprobada dice cómo se la lee: `rss` si publica un feed,
  // `consulta` si es un buscador al que hay que preguntar. Una de las dos.
  //
  // La comprobación no es paranoia: una fuente aprobada sin ninguna de las dos
  // sería un fallo silencioso — no daría error, solo dejaría de aparecer.
  const mudas = aprobadas.filter(f => !f.rss && !f.consulta);
  if (mudas.length > 0) {
    throw new Error(
      'Hay fuentes aprobadas sin forma de leerlas: ' +
        mudas.map(f => f.id).join(', ') +
        '. O se les pone rss o consulta, o vuelven a candidatas.',
    );
  }

  const conFeed = aprobadas.filter(f => f.rss);
  const conConsulta = aprobadas.filter(f => !f.rss && f.consulta);

  const buscadorRss = new BuscadorRss(
    Object.fromEntries(conFeed.map(f => [f.id, f.rss!])),
  );
  const buscadorPmc = new BuscadorEuropePmc(
    Object.fromEntries(
      conConsulta.map(f => [f.id, { consulta: f.consulta!, diasAtras: f.diasAtras }]),
    ),
  );

  const resumidor = new ResumidorClaude();
  // fileURLToPath y no .pathname: en Windows, .pathname devuelve «/C:/…» con
  // una barra delante, y el join de dentro del publicador la convierte en
  // «C:\C:\…», que no existe. Fallaba al escribir, no al arrancar, así que no
  // se veía hasta el final del ciclo — con las llamadas a la IA ya pagadas.
  const carpetaEdiciones = fileURLToPath(new URL('../ediciones/', import.meta.url));
  const publicador = new PublicadorFichero(carpetaEdiciones);

  // Se comprueba ahora que se puede escribir, antes de leer nada y sobre todo
  // antes de pagar los destilados. Es la misma regla que ya sigue el embudo —
  // lo caro va al final— aplicada al revés: lo que puede fallar, cuanto antes.
  await mkdir(carpetaEdiciones, { recursive: true });

  // 1. Recolectar. Las fuentes se consultan a la vez, no en fila.
  console.log(`Leyendo ${conFeed.length} feeds y ${conConsulta.length} buscadores...`);
  const porFuente = await Promise.all([
    ...conFeed.map(f => buscadorRss.buscar(f)),
    ...conConsulta.map(f => buscadorPmc.buscar(f)),
  ]);
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
