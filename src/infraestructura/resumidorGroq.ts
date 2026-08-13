// Adaptador: cumple el puerto Resumidor llamando a Groq.
//
// Existe para que el ciclo diario no cueste dinero. El plan gratuito da
// 100.000 tokens al día en el modelo de 70B, y una edición de 100 piezas gasta
// 82.110 medidos sobre una edición publicada. Cabe con un 18% de holgura.
//
// Sin SDK: la API de Groq es HTTP y Node ya trae fetch. Una dependencia menos.

import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';
import { INSTRUCCIONES, aperturaPara, comprobarNormas, materialDe, validarDestilado } from './instruccionesDestilado.ts';

const EXTREMO = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * El bueno primero, y uno de repuesto cuando se acaba su cupo del día.
 *
 * Una edición de 100 piezas cabe en el cupo diario del 70B con holgura, pero
 * ese cupo es de todo el día y de toda la clave: unas cuantas ejecuciones a
 * mano lo dejan seco antes de que llegue la de la madrugada. Ahí entra el de
 * 8B, con 500.000 al día: escribe algo peor y permite terminar la edición en
 * vez de publicarla a medias.
 */
const MODELO = 'llama-3.3-70b-versatile';
const MODELO_DE_REPUESTO = 'llama-3.1-8b-instant';

/** El plan gratuito admite 30 llamadas por minuto. Dos segundos entre una y
 *  otra deja margen aunque los cupos crezcan. */
const ESPERA_ENTRE_LLAMADAS = 2000;

const REINTENTOS = 3;

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

export class ResumidorGroq implements Resumidor {
  private readonly clave: string;
  private ultimaLlamada = 0;
  /** Se cambia al de repuesto para el resto de la edición, no por pieza. */
  private modelo = MODELO;
  /** Cuántas piezas van servidas, para repartir las aperturas por la edición. */
  private orden = 0;

  constructor(clave: string) {
    if (!clave) throw new Error('Falta GROQ_API_KEY.');
    this.clave = clave;
  }

  async destilar(pieza: Pieza): Promise<Destilado> {
    await this.respetarElRitmo();

    // Se elige una vez por pieza, no por intento: si un reintento cambiara de
    // estructura, dos piezas seguidas podrían acabar abriendo igual.
    const apertura = aperturaPara(this.orden++);

    for (let intento = 1; intento <= REINTENTOS; intento++) {
      const respuesta = await this.pedir(pieza, apertura);

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

  private async pedir(pieza: Pieza, apertura: string): Promise<Response> {
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
        temperature: 0.4,
        // Un destilado son ~70 tokens; el resto es margen para que el JSON
        // cierre. Con 500 se vio alguna frase cortada a media palabra.
        max_tokens: 900,
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

  /** Espacia las llamadas sin dormir de más: solo lo que falte desde la última. */
  private async respetarElRitmo(): Promise<void> {
    const transcurrido = Date.now() - this.ultimaLlamada;
    if (this.ultimaLlamada > 0 && transcurrido < ESPERA_ENTRE_LLAMADAS) {
      await espera(ESPERA_ENTRE_LLAMADAS - transcurrido);
    }
  }
}
