# Operar el proyecto

Qué hacer cuando algo falla, y qué mirar antes de tocar nada.

Los otros documentos explican **cómo está hecho**; este explica **cómo se
mantiene**. Si buscas la organización del código, ve a
[estructura.md](estructura.md); si buscas por qué algo es como es,
[decisiones.md](decisiones.md).

## El ciclo, de un vistazo

```
05:00 (hora española)
  GitHub Action  →  lee 62 fuentes      ~6.700 hallazgos   gratis
                 →  deduplica y puntúa  100 finalistas     gratis
                 →  destila con Groq    100 resúmenes      gratis, con tope
                 →  commit a ediciones/ publicado          gratis
  GitHub Pages   →  sirve el repositorio
```

Publicar **es** hacer commit: no hay servidor que reiniciar ni base de datos
que respaldar. Si el commit está, la web está.

## Los cuatro comandos

| Comando | Qué hace | Necesita |
|---|---|---|
| `npm run edicion` | Genera la edición del día | `GROQ_API_KEY` |
| `npm run servir` | Abre el lector en `localhost:8731` | — |
| `npm test` | 17 pruebas, ~0,3 s | — |
| `npm run tipos` | Comprueba los tipos, no genera nada | — |

La clave va en un fichero `.env` en la raíz, que está en `.gitignore`:

```
GROQ_API_KEY=gsk_...
```

Con `RESUMIDOR=claude` y `ANTHROPIC_API_KEY` los destilados los escribe Claude,
para comparar calidad (decisión 14).

## Dónde vive cada credencial

| Dónde | Para qué | Quién la pone |
|---|---|---|
| `.env` en local | Generar ediciones desde tu máquina | Tú, a mano |
| *Secrets* del repositorio | La acción diaria | Tú, en Settings → Secrets |

**No son la misma clave y no deben serlo.** Si una se filtra, se revoca sin
tocar la otra.

## Problemas conocidos

### La acción diaria falla

Mira el log en la pestaña **Actions** del repositorio. Por orden de
probabilidad:

| Síntoma en el log | Causa | Arreglo |
|---|---|---|
| `Falta GROQ_API_KEY` | El secreto no está o cambió de nombre | Settings → Secrets → `GROQ_API_KEY` |
| `Ninguna fuente devolvió nada` | Sin red, o el catálogo entero caído | Reintentar; si persiste, revisar `config/fuentes.json` |
| `agotado el cupo diario de openai/gpt-oss-120b` | **No es un fallo.** Siguió con el modelo pequeño | Nada |
| `hasta mañana no se escribe más` | **No es un fallo.** Los dos modelos sin cupo; la edición se publicó corta | Nada, o probar menos a mano |
| `Ninguna de las N piezas se pudo destilar` | Sí es un fallo: el resumidor no responde | Ver el 404 de abajo |
| `model_not_found` | Groq retiró el modelo | Cambiar `MODELO` en `resumidorGroq.ts` por uno de `GET /openai/v1/models` |
| `el JSON salió sin cerrar` | **No es un fallo.** El modelo razonó de más; se vuelve a pedir la pieza | Nada |

Los `403` y `521` de fuentes sueltas **son normales**: hay medios que bloquean
robots. Se saltan y la edición sale igual.

### La edición sale muy corta

Los cupos son 50 técnicas + 37 clínicas + 13 de gestión, pero **un cupo que no
se llena no se cede** (decisión 7). Si un ámbito tiene pocas fuentes activas,
su cupo queda corto y la edición sale más pequeña. Se ve en el log:

```
6.694 hallazgos en bruto
100 finalistas tras deduplicar, puntuar y repartir cupos
```

Si el segundo número baja mucho, mira cuántas fuentes hay aprobadas por ámbito
en `config/fuentes.json`. Las 51 candidatas del catálogo son la reserva.

### El lector se ve sin estilos

Casi siempre es que se está sirviendo desde una rama donde `web/estilos/` aún
no existe, o abriendo el fichero a doble clic. El lector pide la edición con
`fetch` y el navegador lo bloquea desde `file://`: hay que usar
`npm run servir`.

### Cambio algo y no lo veo

El service worker guarda la aplicación para leerla sin conexión. Va «primero la
red», así que esto no debería pasar; si pasa, recarga forzando (`Ctrl+Shift+R`)
o desregístralo desde las herramientas de desarrollo → Application → Service
Workers.

### La web publicada no se actualiza

Pages tarda entre uno y tres minutos en reconstruir tras el commit. El estado
se consulta así:

```
gh api repos/Aluonam/mindscrolling/pages --jq .status
```

`building` significa esperar; `built` significa que ya está.

## Los límites reales, medidos

Salen de contar sobre una edición publicada, no de extrapolar.

| Qué | Cuánto | Margen |
|---|---|---|
| Tokens por pieza | **1.384** (1.061 entrada + 323 salida, de ellos 239 de razonamiento) | Medido sobre una llamada real a `gpt-oss-120b` |
| Tokens por edición de 100 piezas | ~138.000 | Hay que mirar el cupo diario en la consola de Groq; las cabeceras no lo dicen |
| Tokens por minuto | **8.000** | Lo dicen las cabeceras `x-ratelimit-limit-tokens`. Es el límite que manda |
| Tokens que reserva cada llamada | ~2.400 (prompt + `max_tokens`) | Groq descuenta lo que pides, no lo que gastas |
| Tiempo de la acción con 100 piezas | ~30 min | El trabajo corta a los 60 (`timeout-minutes`) |
| Espera entre llamadas | La que diga Groq | Se lee de `x-ratelimit-remaining-tokens`; el suelo son 2 s |
| Fuentes que responden | 59 de 62 | Los `403` son estables |

**El límite ya no es el número de llamadas, son los tokens por minuto.** Por eso
la edición tarda media hora y no ocho minutos: no es que el modelo sea lento, es
que hay que darle tiempo al contador.

**Y se reserva lo que pides, no lo que gastas.** Un destilado sale en unos 320
tokens, pero la llamada pide `max_tokens: 1200` y Groq descuenta los 1.200
enteros del cubo del minuto. Por eso subir `max_tokens` alarga la edición
entera, y por eso está donde está: lo justo para que el modelo razone y cierre
el JSON, no más.

**El ritmo no está escrito en el código, se pregunta.** Cada respuesta trae
cuántos tokens quedan en el cubo y cuánto tarda en rellenarse. Si cabe otra
pieza, se pide ya; si no cabe, se espera al relleno. Se probó primero con una
espera fija de once segundos y luego de dieciocho: la primera encadenaba 429 y
la segunda alargaba la edición sin motivo los días que el cubo iba sobrado.
Un número elegido a mano falla por los dos lados.

**Lo que NO es un límite: leer las fuentes.** Traer 6.700 artículos de 62 sitios
son peticiones HTTP normales, gratis y sin cupo. El único recurso contado son
los tokens del modelo que escribe los destilados.

### El cupo es diario y se comparte

El cupo de tokens es de todo el día y de toda la clave, no de cada ejecución.
Cada `npm run edicion` que lances a mano consume del mismo bote que gastará la
acción de la madrugada.

Esto ya pasó: probando el cambio a 100 piezas se agotó el cupo del modelo bueno
y la segunda mitad de la edición la escribió el pequeño, que escribe peor.
**No fue falta de capacidad, fue haberla gastado antes.** Si vas a probar mucho
un día, cuenta con que esa noche la edición puede salir más floja.

**Y si se agota del todo, la edición sale corta pero sale.** Cuando los dos
modelos se quedan sin cupo, el ciclo deja de pedir y publica lo que llevara
escrito; el lector lo explica en la última pantalla. Como las piezas van
entrelazadas por ámbito (decisión 21), una edición cortada a la mitad sigue
trayendo clínico y gestión, no solo técnico.

**Lo único que no se publica es una edición vacía.** Cero destilados significa
que el resumidor está roto, y publicarla dejaría el lector en blanco. Se
conserva la del día anterior y la acción falla para que te enteres.

## Si quieres más calidad en las 100 piezas

Por orden de coste. Los precios de Anthropic son por millón de tokens; el
cálculo mensual asume una edición de 100 piezas al día, 30 días.

| Opción | Coste | Qué mejora | Qué cuesta |
|---|---|---|---|
| **Recortar el material de entrada** — hecho, ver decisión 18 | 0 € | Más margen de cupo, así que probar a mano deja de comprometer la edición de la noche | El modelo ve menos resumen original; en un texto muy largo pierde el final |
| **Recortar más aún**, a 1.200 caracteres | 0 € | Todavía más margen | Empieza a cortar resúmenes de paper por la mitad |
| **Groq de pago (plan Developer)** | Por confirmar | Sube los límites con los mismos modelos | Los valores exactos no están publicados: hay que mirarlos en la consola de la cuenta |
| **Claude Haiku 4.5** | **3,48 $/mes** | Sigue las instrucciones bastante mejor que un modelo abierto | Deja de ser gratis y necesita tarjeta |
| **Claude Sonnet 5** | 10,43 $/mes | Prosa notablemente mejor | Diez veces el precio de Haiku para un texto de 45 palabras |
| **Claude Opus 5** | 17,39 $/mes | El techo de calidad | Difícil de justificar para este formato |

**La recomendación, si un día quieres dar el salto: Haiku 4.5.** Por 3,48 $ al
mes desaparecen de golpe los dos defectos que más se notan hoy —destilados
cortados a media frase y colas que enumeran sus propias claves— porque son
fallos de seguimiento de instrucciones, no de inteligencia.

Cambiar cuesta una variable de entorno: `RESUMIDOR=claude` y una
`ANTHROPIC_API_KEY`. El adaptador ya está escrito y comparte instrucciones con
el de Groq, así que la comparación es justa (decisión 14).

## Qué NO hacer

- **No subas `.env` al repositorio.** Está ignorado; que siga así.
- **No cambies de rama con el servidor local abierto.** Los ficheros del lector
  solo existen en algunas ramas y se sirve una página rota, sin avisar.
- **No mergees mientras alguien trabaja en una rama basada en `main`.** Obliga
  a rehacer el trabajo y arriesga revertir arreglos.
- **No confíes en que el modelo obedezca al prompt.** Lo que no puede fallar se
  valida en código: por eso `validarDestilado` quita el Markdown y descarta las
  claves que no aparecen en el texto.

## Verificar que todo sigue en pie

```
npm test              # 24 pruebas del dominio y de la validación
npm run tipos         # sin errores de tipos
npm run edicion       # una edición real, ~8 min
npm run servir        # y mirarla en localhost:8731
```

Para el lector hay además un recorrido automatizado con el protocolo de Chrome
—43 comprobaciones, incluida la lectura sin conexión— que **no está en el
repositorio**. Es la pieza de verificación que falta por incorporar.
