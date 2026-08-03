// Adaptador: cumple el puerto Resumidor llamando a Claude.
//
// Esta es la operación cara del sistema, y por eso el dominio la deja para el
// final: solo se resume lo que ya ha ganado su sitio en la edición.

import Anthropic from '@anthropic-ai/sdk';
import type { Resumidor } from '../dominio/puertos.ts';
import type { Destilado, Pieza } from '../dominio/tipos.ts';

/** Cambiar por 'claude-haiku-4-5' abarata mucho, a costa de algo de calidad. */
const MODELO = 'claude-opus-5';

const INSTRUCCIONES = `Escribes los resúmenes de MindScrolling, un lector donde cada pieza se lee en una pantalla de móvil.

Reglas:
- Español, entre 35 y 50 palabras. Ni una más.
- Empieza por lo sorprendente o lo que cambia algo. Nunca por el contexto ni por "este artículo trata de".
- Frases cortas y directas. Nada de jerga innecesaria.
- No inventes datos, cifras ni conclusiones que no estén en el material.
- Si el material es insuficiente, resume solo lo que se puede afirmar.

Marca además entre 2 y 3 términos clave: los que, resaltados, permiten captar la idea sin leerlo todo. Deben aparecer literalmente en tu texto.`;

export class ResumidorClaude implements Resumidor {
  private readonly cliente = new Anthropic();

  async destilar(pieza: Pieza): Promise<Destilado> {
    const respuesta = await this.cliente.messages.create({
      model: MODELO,
      max_tokens: 1000,
      system: INSTRUCCIONES,
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
      messages: [{
        role: 'user',
        content: [
          `Fuente: ${pieza.fuente.nombre}`,
          `Título: ${pieza.titulo}`,
          '',
          pieza.resumenOriginal.slice(0, 4000),
        ].join('\n'),
      }],
    });

    if (respuesta.stop_reason === 'refusal') {
      throw new Error(`El modelo declinó resumir "${pieza.titulo}"`);
    }

    const bloque = respuesta.content.find(b => b.type === 'text');
    if (!bloque || bloque.type !== 'text') {
      throw new Error(`Respuesta sin texto para "${pieza.titulo}"`);
    }

    return JSON.parse(bloque.text) as Destilado;
  }
}
