# La IA del proyecto: coste cero, y cómo crecer sin romperlo

**La restricción es que MindScrolling no cueste dinero.** No es un objetivo de
ahorro: es que el proyecto no dependa de una tarjeta para seguir funcionando.
Todo lo que sigue está ordenado por eso. Los precios de pago aparecen al final,
solo como referencia por si algún día la restricción cambia.

Comprobado el **7 de agosto de 2026**. Los cupos gratuitos cambian cada pocos
meses: antes de decidir con esta tabla, revisa las fuentes del final.

## Qué es exactamente lo que consume

Solo el paso 3 del ciclo. Conviene tenerlo claro antes de mirar cupos:

| Paso | Quién lo hace | Consumo |
|---|---|---|
| 1. Recolectar 62 fuentes | `buscadorRss` + `buscadorEuropePmc` | 0 — HTTP normal, sin cupo |
| 2. Deduplicar, puntuar, repartir cupos | `construirEdicion` (dominio puro) | 0 — aritmética |
| **3. Escribir los destilados** | **`resumidorGroq` → el modelo** | **lo único contado** |
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
el proyecto cabe entero en planes gratuitos.

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

Añadir una tarjeta sin gastar nada activa el plan Developer, con unos diez veces
estos límites. **No lo hagas**: sin tarjeta no hay factura sorpresa posible, y
esa garantía vale más que el margen.

## Las cuatro vías gratuitas

Ordenadas por cuánto aguantan antes de romperse.

| Opción | Cupo gratuito | Aguanta hasta | Qué cuesta montarlo |
|---|---|---|---|
| **Groq `gpt-oss-120b`** | 200.000 tok/día | ~150 piezas/día | Nada. Constantes en `resumidorGroq.ts` — pero ojo al razonamiento, ver abajo |
| **Cerebras** | 1.000.000 tok/día | ~1.200 piezas/día | Adaptador nuevo. API compatible con OpenAI, casi copiar el de Groq. Contexto limitado a 8.192 tokens: sobra, usamos 737 por pieza |
| **Google AI Studio (Gemini Flash)** | 1.500 peticiones/día, sin tope de tokens | ~1.500 piezas/día | Adaptador nuevo con API propia. Google puede usar los envíos para entrenar — aquí da igual, son resúmenes de material público |
| **Ollama en local** | Sin límite | Lo que aguante la máquina | El equipo es un Intel N95 sin gráfica: solo entra un modelo de ~3B, muy por debajo de un 70B. Descartado por hardware, no por diseño |

**Descartada: OpenRouter.** Su plan gratuito da 50 peticiones al día y hacen
falta 100. Subirlo a 1.000 exige comprar 10 $ de crédito una vez, así que deja
de ser gratuito.

**El techo real del plan gratuito no es Groq, es Cerebras o Gemini.** Cualquiera
de los dos deja crecer la edición diez veces sin pagar nada.

## La trampa de los modelos de razonamiento

`gpt-oss-120b` y `qwen3.6-27b` razonan antes de responder, y **esos tokens de
razonamiento cuentan como salida**. Dos consecuencias, las dos importantes:

1. **Van contra `max_tokens`.** Con los 900 actuales, el razonamiento se come el
   presupuesto y el JSON sale cortado a media palabra — exactamente el defecto
   que queremos arreglar. Hay que subirlo.
2. **Van contra el cupo diario.** Los 82.110 tokens medidos son con un modelo
   que no razona. Con razonamiento la cifra sube, así que los 200.000 dan menos
   margen del que parece: de ahí que la tabla de arriba diga ~150 piezas y no
   ~240.

Se controlan con `reasoning_effort: 'low'`, que es lo que quiere un destilado de
45 palabras: no hay nada que razonar, solo que resumir.

Lo que **no** hay que tocar es la lectura de la respuesta. En los modelos GPT-OSS
el razonamiento va en un campo `message.reasoning` aparte, y `message.content`
sigue siendo JSON limpio. El código de `resumidorGroq.ts` funciona igual.

## Si la edición crece

| Piezas/día | Tokens/día (sin razonar) | Groq 70B | gpt-oss-120b | Cerebras | Gemini Flash |
|---:|---:|---|---|---|---|
| 100 (hoy) | 82.110 | Sí, al límite | Sí | Sí | Sí |
| 200 | 164.220 | **No** | Ajustado | Sí | Sí |
| 500 | 410.550 | No | **No** | Sí | Sí |
| 1.000 | 821.100 | No | No | Sí, al límite | Sí |
| 1.500 | 1.231.650 | No | No | **No** | Sí, al límite |

También sube el tiempo: a 2 segundos por llamada, 500 piezas son ~17 minutos de
acción, holgado frente al límite de 6 h de GitHub Actions.

## El riesgo de vivir de lo gratuito, y qué hacer con él

Un cupo gratuito es una decisión comercial de otro, y puede desaparecer sin
aviso. La defensa no es elegir bien el proveedor: es **no depender de uno solo**.

El código ya tiene media solución. `resumidorGroq.ts` baja al modelo de repuesto
cuando se agota el cupo del principal, y termina la edición en vez de publicarla
a medias. Lo que falta es que ese respaldo pueda ser **de otro proveedor**, para
que un cambio de política en Groq no deje al proyecto sin destilados.

La cadena que tiene sentido, de mejor a peor y toda gratuita:

```
gpt-oss-120b (Groq, 200K/día)
   └─ agotado o caído → llama-3.1-8b-instant (Groq, 500K/día)
        └─ agotado o caído → Cerebras (1M/día)
             └─ caído → publicar la edición sin destilar esas piezas
```

El último escalón importa tanto como los otros: **una pieza sin destilado sigue
teniendo título y enlace**, que es lo que el lector necesita para llegar al
original. Quedarse sin edición es peor que quedarse sin resumen.

## Qué hacer, por orden

1. **Cambiar a `openai/gpt-oss-120b`** con `reasoning_effort: 'low'` y
   `max_tokens` más alto. Coste cero, duplica el cupo y probablemente arregla
   los dos defectos que se notan hoy — destilados cortados y colas que enumeran
   sus propias claves —, que son fallos de seguimiento de instrucciones y no de
   inteligencia. Medir el consumo real de la primera edición antes de darlo por
   bueno.
2. **Escribir el adaptador de Cerebras** como tercer escalón de la cadena. Es el
   seguro contra que Groq cierre el grifo.
3. **Revisar esta página cada pocos meses** y actualizar la fecha de la cabecera.

Las instrucciones viven en `instruccionesDestilado.ts` y se comparten entre
adaptadores, así que cualquier comparación entre modelos es justa.

## Referencia: qué costaría si algún día se paga

No es el plan. Está aquí para saber qué se está evitando, y para poder decidir
rápido si la restricción cambia. Coste mensual con el consumo medido arriba:

| Opción | $/M entrada | $/M salida | Al mes |
|---|---:|---:|---:|
| DeepSeek V4-Flash | 0,14 | 0,28 | 0,38 $ |
| Groq `gpt-oss-120b` | 0,15 | 0,60 | 0,48 $ |
| Cerebras `gpt-oss-120b` | 0,35 | 0,75 | 0,96 $ |
| Groq `llama-3.3-70b` — el actual | 0,59 | 0,79 | 1,50 $ |
| Claude Haiku 4.5 | 1,00 | 5,00 | 3,48 $ |
| Claude Sonnet 5 | 3,00 | 15,00 | 10,43 $ |
| Claude Opus 5 — el que hay en `resumidorClaude.ts` | 5,00 | 25,00 | 17,39 $ |

`resumidorClaude.ts` sigue existiendo como vara de medir, no como gasto: cuando
haya duda sobre la calidad de un destilado se genera la misma edición con los
dos y se comparan (decisión 14). Para eso, bajar su `MODELO` a
`claude-haiku-4-5` — Opus cuesta cinco veces más para un texto de 45 palabras.

## Fuentes

- [Límites de Groq](https://console.groq.com/docs/rate-limits),
  [catálogo de modelos](https://console.groq.com/docs/models) y
  [modelos de razonamiento](https://console.groq.com/docs/reasoning)
- [Plan gratuito de Cerebras](https://costbench.com/software/llm-api-providers/cerebras-inference/free-plan/)
- [Límites del plan gratuito de Gemini](https://tokenmix.ai/blog/gemini-api-free-tier-limits)
- [Límites de OpenRouter](https://openrouter.zendesk.com/hc/en-us/articles/39501163636379-OpenRouter-Rate-Limits-What-You-Need-to-Know)
- [Precios de Claude](https://platform.claude.com/docs/en/pricing)
