// El único sitio donde se decide QUIÉN cumple cada puerto.
//
// Fíjate en que el dominio no aparece por ninguna parte eligiendo herramientas.
// Aquí se enchufan las piezas concretas y se lanza el ciclo. Cambiar de RSS a
// arXiv, o de Claude a Groq, se hace en este fichero y en ningún otro.

import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { construirEdicion } from './dominio/construirEdicion.ts';
import type {
  Cupos, Edicion, FuenteCatalogada, Hallazgo, Interes, PiezaPublicada,
} from './dominio/tipos.ts';
import { BuscadorRss } from './infraestructura/buscadorRss.ts';
import { BuscadorEuropePmc } from './infraestructura/buscadorEuropePmc.ts';
import { ResumidorClaude } from './infraestructura/resumidorClaude.ts';
import { ResumidorGroq } from './infraestructura/resumidorGroq.ts';
import { PublicadorFichero } from './infraestructura/publicadorFichero.ts';
import type { Resumidor } from './dominio/puertos.ts';

type Configuracion = {
  cupos: Cupos;
  fuentes: FuenteCatalogada[];
  intereses: Interes[];
};

/**
 * Quién escribe los destilados. `RESUMIDOR=claude` para comparar; por defecto
 * Groq, que es el que no cuesta dinero.
 *
 * Se comprueba la clave aquí, al arrancar. El resumen es el paso 3: si falta
 * la credencial, sin esto no se sabría hasta después de leer 62 fuentes.
 */
function elegirResumidor(): Resumidor {
  const elegido = process.env.RESUMIDOR ?? 'groq';

  if (elegido === 'groq') {
    const clave = process.env.GROQ_API_KEY;
    if (!clave) {
      throw new Error(
        'Falta GROQ_API_KEY. Se saca gratis en https://console.groq.com. ' +
          'Con RESUMIDOR=claude se usa Claude, que necesita ANTHROPIC_API_KEY.',
      );
    }
    console.log('Destilados: Groq (gratuito)');
    return new ResumidorGroq(clave);
  }

  if (elegido === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Falta ANTHROPIC_API_KEY para RESUMIDOR=claude.');
    }
    console.log('Destilados: Claude (de pago)');
    return new ResumidorClaude();
  }

  throw new Error(`RESUMIDOR=${elegido} no existe. Opciones: groq, claude.`);
}

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

  const resumidor = elegirResumidor();
  // fileURLToPath y no .pathname: en Windows .pathname devuelve «/C:/…» y el
  // join del publicador acaba pidiendo «C:\C:\…».
  const carpetaEdiciones = fileURLToPath(new URL('../ediciones/', import.meta.url));
  const publicador = new PublicadorFichero(carpetaEdiciones);

  // Se prepara al arrancar, no al publicar: el paso 4 va después de pagar los
  // destilados del paso 3.
  await mkdir(carpetaEdiciones, { recursive: true });

  // 1. Recolectar. Las fuentes se consultan a la vez, no en fila.
  //
  // allSettled y no all: con `all`, una sola fuente que lance se lleva por
  // delante las otras 61 y no hay edición. Los adaptadores ya capturan lo suyo,
  // pero esto es lo que garantiza que ninguno futuro pueda tumbar el ciclo.
  console.log(`Leyendo ${conFeed.length} feeds y ${conConsulta.length} buscadores...`);
  const porFuente = await Promise.allSettled([
    ...conFeed.map(f => buscadorRss.buscar(f)),
    ...conConsulta.map(f => buscadorPmc.buscar(f)),
  ]);

  const caidas = porFuente.filter(r => r.status === 'rejected');
  for (const caida of caidas) {
    console.warn(`  · una fuente falló sin capturarlo: ${caida.reason}`);
  }

  const hallazgos: Hallazgo[] = porFuente
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  console.log(`  ${hallazgos.length} hallazgos en bruto` +
    (caidas.length ? ` (${caidas.length} fuentes caídas)` : ''));

  // Cero hallazgos con todo el catálogo caído no es "un día tranquilo": es que
  // algo va mal. Mejor fallar que publicar una edición vacía en silencio.
  if (hallazgos.length === 0) {
    throw new Error('Ninguna fuente devolvió nada. Revisa la red o el catálogo.');
  }

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
