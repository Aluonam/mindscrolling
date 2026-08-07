// Adaptador: cumple el puerto Resumidor llamando a Groq.
//
// Existe para que el ciclo diario no cueste dinero. El plan gratuito da
// 100.000 tokens al día en el modelo de 70B; una edición de ocho piezas gasta
// unos 5.900, así que sobra incluso multiplicando por diez el cupo.
//
// Sin SDK: la API de Groq es HTTP y Node ya trae fetch. Una dependencia menos.

import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';
import { INSTRUCCIONES, materialDe, validarDestilado } from './instruccionesDestilado.ts';

const EXTREMO = 'https://api.groq.com/openai/v1/chat/completions';

/** 70B por calidad: el cupo diario da de sobra para una edición. */
const MODELO = 'llama-3.3-70b-versatile';

/** El plan gratuito admite 30 llamadas por minuto. Dos segundos entre una y
 *  otra deja margen aunque los cupos crezcan. */
const ESPERA_ENTRE_LLAMADAS = 2000;

const REINTENTOS = 3;

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

export class ResumidorGroq implements Resumidor {
  private readonly clave: string;
  private ultimaLlamada = 0;

  constructor(clave: string) {
    if (!clave) throw new Error('Falta GROQ_API_KEY.');
    this.clave = clave;
  }

  async destilar(pieza: Pieza): Promise<Destilado> {
    await this.respetarElRitmo();

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      const respuesta = await this.pedir(pieza);

      if (respuesta.status === 429) {
        // Groq dice cuánto esperar; si no lo dice, se sube el listón solo.
        const cabecera = Number(respuesta.headers.get('retry-after'));
        const pausa = Number.isFinite(cabecera) && cabecera > 0
          ? cabecera * 1000
          : ESPERA_ENTRE_LLAMADAS * 2 ** intento;

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
        model: MODELO,
        // El formato JSON se pide por parámetro y se repite en el mensaje:
        // el parámetro garantiza JSON válido, no que traiga estos campos.
        response_format: { type: 'json_object' },
        temperature: 0.4,
        max_tokens: 500,
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
    const transcurrido = Date.now() - this.ultimaLlamada;
    if (this.ultimaLlamada > 0 && transcurrido < ESPERA_ENTRE_LLAMADAS) {
      await espera(ESPERA_ENTRE_LLAMADAS - transcurrido);
    }
  }
}
