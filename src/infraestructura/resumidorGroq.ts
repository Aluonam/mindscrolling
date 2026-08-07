// Adaptador: cumple el puerto Resumidor llamando a Groq.
//
// Existe para que el ciclo diario no cueste dinero. El plan gratuito da
// 200.000 tokens al día en el modelo principal, y una edición de 100 piezas
// gasta unos 62.000 — medido sobre tres piezas reales y proyectado. Cabe tres
// veces. Con el 70B anterior eran 90.000 contra un cupo de 100.000: el cambio
// no mejora el margen, lo multiplica.
//
// El cupo diario, sin embargo, no es el límite que aprieta. Ver TOKENS_POR_MINUTO.
//
// Sin SDK: la API de Groq es HTTP y Node ya trae fetch. Una dependencia menos.

import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';
import { INSTRUCCIONES, materialDe, validarDestilado } from './instruccionesDestilado.ts';

const EXTREMO = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * El bueno primero, y uno de repuesto cuando se acaba su cupo del día.
 *
 * Una edición de 100 piezas cabe en el cupo diario del principal con holgura,
 * pero ese cupo es de todo el día y de toda la clave: unas cuantas ejecuciones
 * a mano lo dejan seco antes de que llegue la de la madrugada. Ahí entra el de
 * 8B, con 500.000 al día: escribe algo peor y permite terminar la edición en
 * vez de publicarla a medias.
 */
const MODELO = 'openai/gpt-oss-120b';
const MODELO_DE_REPUESTO = 'llama-3.1-8b-instant';

/**
 * Cuánto puede razonar el modelo antes de responder.
 *
 * `low` a propósito: un destilado de 45 palabras no tiene nada que razonar,
 * solo que resumir. Y el razonamiento no es gratis por partida doble — cuenta
 * como tokens de salida contra el cupo diario, y se descuenta de `max_tokens`
 * antes de que empiece a escribir el JSON.
 *
 * Solo lo entienden los modelos que razonan. El de repuesto lo ignora.
 */
const ESFUERZO_DE_RAZONAMIENTO = 'low';

/**
 * Cuántos tokens por minuto concede el plan gratuito a cada modelo.
 *
 * Este es el límite que de verdad aprieta, y no el de 200.000 al día: una
 * edición entera cabe de sobra en el cupo diario, pero no cabe en un minuto.
 */
const TOKENS_POR_MINUTO: Record<string, number> = {
  'openai/gpt-oss-120b': 8_000,
  'llama-3.1-8b-instant': 6_000,
};

/**
 * El techo de salida, y por qué es tan bajo.
 *
 * Medido: el razonamiento en `low` ocupa unos 40 tokens y el destilado unos
 * 130. Con 700 sobra cuatro veces.
 *
 * No se sube "por si acaso" porque **Groq reserva `max_tokens` entero contra
 * el cupo del minuto en el momento de pedir**, se gasten después o no. Con
 * 3.000 aquí, cada llamada consume 3.800 del cupo por minuto y solo caben dos;
 * con 700 caben cinco. Un techo generoso no es gratis: es el precio de entrada.
 */
const MAXIMO_DE_SALIDA = 700;

/** Lo que ocupa el material de una pieza. Medido: ~800 tokens. */
const ENTRADA_TIPICA = 800;

/**
 * Cuánto esperar entre llamadas para no chocar con el cupo del minuto.
 *
 * Se calcula, no se fija a ojo: cada llamada reserva entrada + techo de salida,
 * así que en un minuto caben `tokensPorMinuto / esa suma`. Salen unos 11 s con
 * el modelo principal — una edición de 100 piezas tarda ~19 minutos, holgado
 * frente al límite de 6 h de la acción.
 *
 * El reintento con `retry-after` sigue ahí para lo que se escape, pero esperar
 * bien de entrada es mejor que reintentar: un 429 gasta cupo igual.
 */
function esperaEntreLlamadas(modelo: string): number {
  const porMinuto = TOKENS_POR_MINUTO[modelo] ?? 6_000;
  return Math.ceil((60_000 * (ENTRADA_TIPICA + MAXIMO_DE_SALIDA)) / porMinuto);
}

const REINTENTOS = 3;

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

export class ResumidorGroq implements Resumidor {
  private readonly clave: string;
  private ultimaLlamada = 0;
  /** Se cambia al de repuesto para el resto de la edición, no por pieza. */
  private modelo = MODELO;

  constructor(clave: string) {
    if (!clave) throw new Error('Falta GROQ_API_KEY.');
    this.clave = clave;
  }

  async destilar(pieza: Pieza): Promise<Destilado> {
    await this.respetarElRitmo();

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      const respuesta = await this.pedir(pieza);

      if (respuesta.status === 429) {
        const cuerpo = await respuesta.text();

        // Hay dos 429 distintos y se tratan al revés: el del minuto se pasa
        // esperando, el del día no se pasa hoy. Esperar al segundo sería
        // dormir hasta mañana.
        if (/tokens per day|TPD|requests per day|RPD/i.test(cuerpo) && this.modelo !== MODELO_DE_REPUESTO) {
          console.warn(`  · agotado el cupo diario de ${this.modelo}; sigo con ${MODELO_DE_REPUESTO}`);
          this.modelo = MODELO_DE_REPUESTO;
          continue;
        }

        // Groq dice cuánto esperar; si no lo dice, se sube el listón solo.
        const cabecera = Number(respuesta.headers.get('retry-after'));
        const pausa = Number.isFinite(cabecera) && cabecera > 0
          ? cabecera * 1000
          : esperaEntreLlamadas(this.modelo) * 2 ** intento;

        if (intento === REINTENTOS) {
          throw new Error(`Groq sigue limitando tras ${REINTENTOS} intentos.`);
        }
        await espera(pausa);
        continue;
      }

      if (!respuesta.ok) {
        throw new Error(`Groq respondió ${respuesta.status}: ${await respuesta.text()}`);
      }

      const cuerpo = await respuesta.json() as {
        choices?: { message?: { content?: string } }[];
      };
      const contenido = cuerpo.choices?.[0]?.message?.content;
      if (!contenido) throw new Error('Groq devolvió una respuesta vacía.');

      return validarDestilado(JSON.parse(contenido));
    }

    throw new Error('Groq no devolvió nada utilizable.');
  }

  private async pedir(pieza: Pieza): Promise<Response> {
    this.ultimaLlamada = Date.now();

    return fetch(EXTREMO, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.clave}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: this.modelo,
        // El formato JSON se pide por parámetro y se repite en el mensaje:
        // el parámetro garantiza JSON válido, no que traiga estos campos.
        response_format: { type: 'json_object' },
        // Solo para el que razona: al de repuesto, que no razona, mandarle
        // este parámetro es pedirle algo que no sabe hacer.
        ...(this.modelo === MODELO ? { reasoning_effort: ESFUERZO_DE_RAZONAMIENTO } : {}),
        temperature: 0.4,
        max_tokens: MAXIMO_DE_SALIDA,
        messages: [
          {
            role: 'system',
            content: `${INSTRUCCIONES}\n\nResponde solo con un objeto JSON: {"texto": "...", "clave": ["...", "..."]}`,
          },
          { role: 'user', content: materialDe(pieza) },
        ],
      }),
    });
  }

  /** Espacia las llamadas sin dormir de más: solo lo que falte desde la última. */
  private async respetarElRitmo(): Promise<void> {
    const debido = esperaEntreLlamadas(this.modelo);
    const transcurrido = Date.now() - this.ultimaLlamada;
    if (this.ultimaLlamada > 0 && transcurrido < debido) {
      await espera(debido - transcurrido);
    }
  }
}
