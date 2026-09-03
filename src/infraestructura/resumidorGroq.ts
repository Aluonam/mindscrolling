// Adaptador: cumple el puerto Resumidor llamando a Groq.
//
// Existe para que el ciclo diario no cueste dinero. El plan gratuito da 8.000
// tokens por minuto —eso lo dicen las cabeceras de cada respuesta— y un cupo
// diario que hay que mirar en la consola de Groq. Una edición de 100 piezas
// gasta unos 138.000 tokens, medidos sobre una pieza real.
//
// Sin SDK: la API de Groq es HTTP y Node ya trae fetch. Una dependencia menos.

import { SinCupoHoy } from '../dominio/errores.ts';
import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';
import { INSTRUCCIONES, aperturaPara, comprobarNormas, materialDe, validarDestilado } from './instruccionesDestilado.ts';

const EXTREMO = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * El bueno primero, y uno de repuesto cuando se acaba su cupo del día.
 *
 * Antes eran los Llama de Meta, que Groq retiró: desde entonces respondía 404
 * a cada pieza y las ediciones salían vacías. Los gpt-oss ocupan su sitio en
 * el plan gratuito.
 *
 * El cupo diario es de toda la clave, no de la edición: unas cuantas
 * ejecuciones a mano lo dejan seco antes de que llegue la de la madrugada. Ahí
 * entra el de 20B, que escribe algo peor y permite terminar la edición en vez
 * de publicarla a medias.
 */
const MODELO = 'openai/gpt-oss-120b';
const MODELO_DE_REPUESTO = 'openai/gpt-oss-20b';

/**
 * Los gpt-oss razonan antes de responder, y ese razonamiento se paga en
 * tokens. En «low» piensan lo justo para cumplir las normas del destilado.
 */
const ESFUERZO_DE_RAZONAMIENTO = 'low';

/**
 * El suelo del ritmo, no el ritmo. El de verdad lo marca Groq.
 *
 * Cada respuesta trae cuántos tokens quedan en el cubo del minuto y cuánto
 * tarda en rellenarse, así que no hace falta adivinar la espera: se pregunta.
 * Esto es solo para no encadenar llamadas cuando el cubo va sobrado.
 */
const ESPERA_MINIMA = 2000;

/**
 * Lo que reserva una llamada: el prompt más el `max_tokens` entero.
 *
 * Groq no descuenta del cubo lo que gastas, descuenta lo que pides. Un
 * destilado sale en unos 320 tokens y aun así la llamada aparta 2.300. Sirve
 * para saber, antes de llamar, si en el cubo cabe otra pieza.
 */
const COSTE_RESERVADO = 2300;

const REINTENTOS = 5;

/**
 * Más de esto esperando y ya no es una pausa, es el cupo del día disfrazado.
 *
 * Groq contesta a los 429 con un retry-after que a veces vale horas. Dormirlo
 * dejaría el ciclo colgado hasta mañana sin publicar nada; mejor darlo por
 * agotado y cerrar la edición con lo que haya.
 */
const PAUSA_MAXIMA = 60_000;

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Los tiempos de Groq vienen como «53.115s», «1m24s» o «1h24m57.599s».
 *
 * Devuelve milisegundos, y 0 si no entiende lo que le dan: un ritmo que no se
 * sabe calcular no debe convertirse en una espera de horas por accidente.
 */
export function aMilisegundos(valor: string | null): number {
  if (!valor) return 0;

  const partes = valor.matchAll(/([\d.]+)\s*(ms|h|m|s)/g);
  const unidades: Record<string, number> = { h: 3_600_000, m: 60_000, s: 1000, ms: 1 };

  let total = 0;
  for (const [, numero, unidad] of partes) total += Number(numero) * unidades[unidad];

  return Number.isFinite(total) ? total : 0;
}

export class ResumidorGroq implements Resumidor {
  private readonly clave: string;
  private ultimaLlamada = 0;
  /** Lo que queda en el cubo del minuto, según la última respuesta. */
  private tokensEnElCubo = Infinity;
  /** Lo que tarda ese cubo en volver a estar lleno. */
  private rellenoEnMs = 0;
  /** Se cambia al de repuesto para el resto de la edición, no por pieza. */
  private modelo = MODELO;
  /** Si llegó a pasar, el lector lo dice al final de la edición. */
  private cupoAgotado = false;
  /** Cuántas piezas van servidas, para repartir las aperturas por la edición. */
  private orden = 0;

  constructor(clave: string) {
    if (!clave) throw new Error('Falta GROQ_API_KEY.');
    this.clave = clave;
  }

  async destilar(pieza: Pieza): Promise<Destilado> {
    // Se elige una vez por pieza, no por intento: si un reintento cambiara de
    // estructura, dos piezas seguidas podrían acabar abriendo igual.
    const apertura = aperturaPara(this.orden++);

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      // Dentro del bucle y no fuera: un reintento también gasta cubo, y
      // lanzarlo sin mirar es la forma más tonta de encadenar 429.
      await this.respetarElRitmo();

      const respuesta = await this.pedir(pieza, apertura);

      if (respuesta.status === 429) {
        const cuerpo = await respuesta.text();

        // Hay dos 429 distintos y se tratan al revés: el del minuto se pasa
        // esperando, el del día no se pasa hoy. Esperar al segundo sería
        // dormir hasta mañana.
        if (/tokens per day|TPD|requests per day|RPD/i.test(cuerpo)) {
          // Queda un modelo por probar: se cambia y la edición sigue.
          if (this.modelo !== MODELO_DE_REPUESTO) {
            console.warn(`  · agotado el cupo diario de ${this.modelo}; sigo con ${MODELO_DE_REPUESTO}`);
            this.modelo = MODELO_DE_REPUESTO;
            this.cupoAgotado = true;
            continue;
          }

          // No queda ninguno. Insistir con las piezas restantes sería gastar
          // media hora en recibir el mismo 429 cien veces.
          throw new SinCupoHoy(
            `Agotado también el cupo diario de ${MODELO_DE_REPUESTO}: hasta mañana no se escribe más.`,
          );
        }

        // Groq dice cuánto esperar, en `retry-after` o en el relleno del cubo.
        // Si no dice nada, se sube el listón solo.
        const cabecera = Number(respuesta.headers.get('retry-after'));
        const pausa = Number.isFinite(cabecera) && cabecera > 0
          ? cabecera * 1000
          : this.rellenoEnMs || ESPERA_MINIMA * 2 ** intento;

        // Una pausa de horas no es un límite por minuto mal etiquetado: es que
        // el día se acabó, aunque el cuerpo del 429 no lo diga con esas
        // palabras.
        if (pausa > PAUSA_MAXIMA) {
          throw new SinCupoHoy(
            `Groq pide esperar ${Math.round(pausa / 60000)} minutos: el cupo del día está agotado.`,
          );
        }

        if (intento === REINTENTOS) {
          throw new Error(`Groq sigue limitando tras ${REINTENTOS} intentos.`);
        }
        await espera(pausa);
        continue;
      }

      if (!respuesta.ok) {
        const cuerpo = await respuesta.text();

        // El modelo se quedó sin sitio para cerrar el JSON, casi siempre por
        // haber razonado de más. Se vuelve a pedir en vez de perder la pieza:
        // con temperatura 0,4 el segundo intento razona distinto.
        if (respuesta.status === 400 && cuerpo.includes('json_validate_failed') && intento < REINTENTOS) {
          console.warn(`  · reintentando "${pieza.titulo.slice(0, 40)}": el JSON salió sin cerrar`);
          continue;
        }

        throw new Error(`Groq respondió ${respuesta.status}: ${cuerpo}`);
      }

      const cuerpo = await respuesta.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const contenido = cuerpo.choices?.[0]?.message?.content;
      if (!contenido) throw new Error('Groq devolvió una respuesta vacía.');

      // Un texto que incumple las normas se vuelve a pedir en vez de perderse.
      // Con temperatura 0,4 el segundo intento sale distinto, y salvar la pieza
      // cuesta una llamada mientras que descartarla deja la edición más corta.
      try {
        return comprobarNormas(validarDestilado(JSON.parse(contenido)));
      } catch (error) {
        if (intento === REINTENTOS) throw error;
        console.warn(`  · reescribiendo "${pieza.titulo.slice(0, 40)}": ${(error as Error).message}`);
        continue;
      }
    }

    throw new Error('Groq no devolvió nada utilizable.');
  }

  informar(): { cupoAgotado: boolean } {
    return { cupoAgotado: this.cupoAgotado };
  }

  private async pedir(pieza: Pieza, apertura: string): Promise<Response> {
    this.ultimaLlamada = Date.now();

    const respuesta = await this.llamar(pieza, apertura);

    // Se apunta en cada respuesta, también en los 429: es lo que permite que
    // la siguiente pieza salga a la velocidad que Groq consienta hoy.
    // Con `Number(null)` daría 0 y creeríamos el cubo vacío: una cabecera que
    // no viene no es una cabecera que dice cero.
    const quedan = respuesta.headers.get('x-ratelimit-remaining-tokens');
    if (quedan !== null && Number.isFinite(Number(quedan))) this.tokensEnElCubo = Number(quedan);
    this.rellenoEnMs = aMilisegundos(respuesta.headers.get('x-ratelimit-reset-tokens'));

    return respuesta;
  }

  private llamar(pieza: Pieza, apertura: string): Promise<Response> {
    return fetch(EXTREMO, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.clave}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelo,
        reasoning_effort: ESFUERZO_DE_RAZONAMIENTO,
        // El formato JSON se pide por parámetro y se repite en el mensaje:
        // el parámetro garantiza JSON válido, no que traiga estos campos.
        response_format: { type: 'json_object' },
        temperature: 0.4,
        // Un destilado son ~70 tokens, pero aquí dentro va también el
        // razonamiento del modelo, que en una pieza enrevesada se dispara.
        // Con 900 hubo piezas que gastaron el presupuesto entero pensando y
        // devolvieron un 400 con el JSON vacío.
        //
        // No se sube más porque esta cifra se paga aunque no se use: entra
        // entera en la reserva del límite por minuto y decide cuánto hay que
        // esperar entre piezas. 1.200 cubre lo normal —unos 320 de salida— y
        // lo excepcional lo salva el reintento de abajo.
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content: `${INSTRUCCIONES}\n\n${apertura}\n\nResponde solo con un objeto JSON: {"texto": "...", "clave": ["...", "..."]}`,
          },
          { role: 'user', content: materialDe(pieza) },
        ],
      }),
    });
  }

  /**
   * Espera lo que haga falta y ni un segundo más.
   *
   * El ritmo no es un número elegido a mano: si en el cubo del minuto cabe otra
   * pieza, se va al suelo de dos segundos; si no cabe, se espera a que se
   * rellene. Así la edición corre cuando puede y frena cuando debe, sin
   * depender de que acertemos la cuenta.
   *
   * Un fijo mal calculado falla por los dos lados: corto, encadena 429; largo,
   * alarga la edición sin motivo.
   */
  private async respetarElRitmo(): Promise<void> {
    if (this.ultimaLlamada === 0) return;

    const desdeLaUltima = Date.now() - this.ultimaLlamada;

    // El cubo no da para otra: se espera al relleno, más un segundo de cortesía
    // para no llegar justo en el borde.
    const pausa = this.tokensEnElCubo < COSTE_RESERVADO
      ? Math.min(this.rellenoEnMs + 1000, PAUSA_MAXIMA)
      : ESPERA_MINIMA;

    if (desdeLaUltima < pausa) await espera(pausa - desdeLaUltima);
  }
}
