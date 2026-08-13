// Adaptador: cumple el puerto Resumidor llamando a Claude.
//
// Esta es la operación cara del sistema, y por eso el dominio la deja para el
// final: solo se resume lo que ya ha ganado su sitio en la edición.

import Anthropic from '@anthropic-ai/sdk';
import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';
import { INSTRUCCIONES, aperturaPara, comprobarNormas, materialDe, validarDestilado } from './instruccionesDestilado.ts';

/** Cambiar por 'claude-haiku-4-5' abarata mucho, a costa de algo de calidad. */
const MODELO = 'claude-opus-5';

// El SDK tiene que ser 0.115 o superior: output_config no existía en 0.70 y
// npm run tipos fallaba por eso desde el primer commit.

export class ResumidorClaude implements Resumidor {
  private readonly cliente = new Anthropic();
  /** Cuántas piezas van servidas, para repartir las aperturas por la edición. */
  private orden = 0;

  async destilar(pieza: Pieza): Promise<Destilado> {
    // La misma rotación que en el adaptador de Groq. Si los dos escribieran
    // con reglas distintas, compararlos no significaría nada (decisión 14).
    const apertura = aperturaPara(this.orden++);

    const respuesta = await this.cliente.messages.create({
      model: MODELO,
      max_tokens: 1000,
      system: `${INSTRUCCIONES}\n\n${apertura}`,
      output_config: {
        // Resumir no necesita razonamiento profundo, y el esfuerzo se paga.
        effort: 'low',
        // Así la respuesta llega ya con forma y no hay que adivinar nada.
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              texto: { type: 'string' },
              clave: { type: 'array', items: { type: 'string' } },
            },
            required: ['texto', 'clave'],
            additionalProperties: false,
          },
        },
      },
      messages: [{ role: 'user', content: materialDe(pieza) }],
    });

    if (respuesta.stop_reason === 'refusal') {
      throw new Error(`El modelo declinó resumir "${pieza.titulo}"`);
    }

    const bloque = respuesta.content.find(b => b.type === 'text');
    if (!bloque || bloque.type !== 'text') {
      throw new Error(`Respuesta sin texto para "${pieza.titulo}"`);
    }

    return comprobarNormas(validarDestilado(JSON.parse(bloque.text)));
  }
}
