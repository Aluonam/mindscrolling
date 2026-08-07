# Alternativas de IA y vías de crecimiento

Comprobado el **7 de agosto de 2026**. Los cupos gratuitos y los precios por
token cambian cada pocos meses: antes de decidir con esta tabla, revisa las
fuentes del final.

## Qué es exactamente lo que se paga

Solo el paso 3 del ciclo. Conviene tenerlo claro antes de mirar precios:

| Paso | Quién lo hace | Coste |
|---|---|---|
| 1. Recolectar 62 fuentes | `buscadorRss` + `buscadorEuropePmc` | 0 — HTTP normal, sin cupo |
| 2. Deduplicar, puntuar, repartir cupos | `construirEdicion` (dominio puro) | 0 — aritmética |
| **3. Escribir los destilados** | **`resumidorGroq` → Llama 3.3 70B** | **lo único contado** |
| 4. Publicar el JSON | `publicadorFichero` | 0 — escribir un fichero |

Groq no descarga nada y no es el modelo: es quien hospeda a **Llama 3.3 70B**,
de Meta. Cambiar de proveedor o de modelo es un fichero nuevo detrás del puerto
`Resumidor` y una línea en `ejecutar.ts` (decisión 14).

**El consumo medido**, sobre una edición publicada de 100 piezas:

| | Por edición | Al mes (30 días) |
|---|---:|---:|
| Entrada | 73.656 | 2.209.680 |
| Salida | 8.454 | 253.620 |
| **Total** | **82.110** | **2.463.300** |

Son ~737 tokens de entrada y ~85 de salida por pieza. Cifras pequeñas: por eso
casi todo cabe en un plan gratuito, y por eso lo de pago sale a céntimos.

## El plan gratuito de Groq no ha desaparecido

La tabla de precios por token que aparece en su web es lo que se cobra **cuando
pasas del cupo**, no en lugar del cupo. A día de hoy el plan gratuito sigue
dando 30 peticiones por minuto y 1.000 al día, con un tope de tokens distinto
por modelo:

| Modelo en Groq | Gratis al día | Margen con 100 piezas |
|---|---:|---|
| `llama-3.3-70b-versatile` — el que usamos | 100.000 | **18%** — justo |
| `openai/gpt-oss-120b` | 200.000 | **144%** — holgado |
| `openai/gpt-oss-20b` | 200.000 | 144% |
| `qwen/qwen3.6-27b` (preview) | 200.000 | 144% |
| `llama-3.1-8b-instant` — el de repuesto | 500.000 | 509% |

**Aquí está la mejora más barata que existe hoy:** `gpt-oss-120b` da el doble de
cupo gratuito que el modelo actual, es más nuevo, va a 500 tokens/s en vez de
280, y si algún día se paga cuesta menos. Es cambiar una constante en
`resumidorGroq.ts`.

Añadir una tarjeta sin gastar nada activa el plan Developer: unas 10 veces los
límites y un 25% de descuento sobre el precio por token.

## Crecer sin pagar

Ordenadas por cuánto aguantan antes de romperse.

| Opción | Cupo gratuito | Aguanta hasta | Qué cuesta |
|---|---|---|---|
| **Groq `gpt-oss-120b`** | 200.000 tok/día | ~240 piezas/día | Nada. Una constante |
| **Cerebras** | 1.000.000 tok/día | ~1.200 piezas/día | Adaptador nuevo (API compatible OpenAI, casi copiar el de Groq). Contexto limitado a 8.192 tokens — sobra: usamos 737 por pieza |
| **Google AI Studio (Gemini Flash)** | 1.500 peticiones/día, sin tope de tokens | ~1.500 piezas/día | Adaptador nuevo con API propia. Google puede usar los envíos para entrenar — aquí da igual, son resúmenes públicos |
| **OpenRouter** | 50 peticiones/día | **no llega** a 100 piezas | Comprar 10 $ de crédito una vez lo sube a 1.000/día para siempre. Útil como banco de pruebas: un adaptador y cambias de modelo con un string |
| **Ollama en local** | Sin límite | Lo que aguante la máquina | El equipo de trabajo es un Intel N95 sin gráfica: solo entra un modelo de ~3B, muy por debajo de un 70B. Descartado por hardware, no por diseño |

**El techo real del plan gratuito no es Groq, es Cerebras o Gemini.** Cualquiera
de los dos deja crecer la edición diez veces sin pagar nada.

## Crecer pagando

Coste mensual con el consumo medido arriba (100 piezas al día, 30 días):

| Opción | $/M entrada | $/M salida | **Al mes** |
|---|---:|---:|---:|
| DeepSeek V4-Flash | 0,14 | 0,28 | **0,38 $** |
| Groq `gpt-oss-120b` | 0,15 | 0,60 | **0,48 $** |
| Cerebras `gpt-oss-120b` | 0,35 | 0,75 | **0,96 $** |
| DeepSeek V4-Pro | 0,435 | 0,87 | **1,18 $** |
| Groq `llama-3.3-70b` — el actual | 0,59 | 0,79 | **1,50 $** |
| Groq `qwen3.6-27b` | 0,60 | 3,00 | **2,09 $** |
| **Claude Haiku 4.5** | 1,00 | 5,00 | **3,48 $** |
| Claude Sonnet 5 | 3,00 | 15,00 | **10,43 $** |
| Claude Opus 5 — el que hay puesto en `resumidorClaude.ts` | 5,00 | 25,00 | **17,39 $** |

Sonnet 5 tiene precio de lanzamiento (2 $/10 $) hasta el 31 de agosto de 2026,
lo que lo deja en 6,96 $/mes mientras dure.

Ninguna de estas cifras llega a lo que cuesta un café al mes salvo las dos
últimas. **El dinero no es la razón para elegir; la calidad del texto sí.**

## Si la edición crece

Qué pasa al subir el número de piezas diarias:

| Piezas/día | Tokens/día | Gratis en Groq 70B | Gratis en gpt-oss-120b | Gratis en Cerebras | Haiku 4.5 |
|---:|---:|---|---|---|---:|
| 100 (hoy) | 82.110 | Sí, al límite | Sí | Sí | 3,48 $/mes |
| 200 | 164.220 | **No** | Sí, justo | Sí | 6,96 $/mes |
| 500 | 410.550 | No | **No** | Sí | 17,39 $/mes |
| 1.000 | 821.100 | No | No | Sí, al límite | 34,78 $/mes |

También sube el tiempo: a 2 segundos por llamada, 500 piezas son ~17 minutos de
acción, dentro del límite de 6 h de GitHub Actions.

## Qué hacer, por orden

1. **Cambiar a `openai/gpt-oss-120b` en Groq.** Coste cero, una constante,
   duplica el margen del cupo y probablemente arregla los dos defectos que se
   notan hoy — destilados cortados a media frase y colas que enumeran sus
   propias claves —, que son fallos de seguimiento de instrucciones y no de
   inteligencia.
2. **Si no basta, comparar con Claude Haiku 4.5.** 3,48 $/mes y el adaptador ya
   existe. Antes de probarlo, bajar `MODELO` en `resumidorClaude.ts` de
   `claude-opus-5` a `claude-haiku-4-5`: Opus cuesta cinco veces más para un
   texto de 45 palabras.
3. **Si el objetivo es no pagar nunca, escribir el adaptador de Cerebras.** Un
   millón de tokens al día deja crecer la edición diez veces.

Las instrucciones viven en `instruccionesDestilado.ts` y se comparten entre
adaptadores, así que cualquiera de estas comparaciones es justa.

## Fuentes

- [Límites de Groq](https://console.groq.com/docs/rate-limits) y
  [catálogo de modelos](https://console.groq.com/docs/models)
- [Plan gratuito de Cerebras](https://costbench.com/software/llm-api-providers/cerebras-inference/free-plan/)
- [Límites del plan gratuito de Gemini](https://tokenmix.ai/blog/gemini-api-free-tier-limits)
- [Precios de DeepSeek](https://deepseek.ai/pricing)
- [Límites de OpenRouter](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know)
- [Precios de Claude](https://platform.claude.com/docs/en/pricing)
