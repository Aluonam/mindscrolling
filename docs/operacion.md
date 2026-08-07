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
| `Groq sigue limitando tras 3 intentos` | Cupo diario agotado en ambos modelos | Esperar a mañana o bajar cupos |
| `agotado el cupo diario de llama-3.3-70b` | **No es un fallo.** Siguió con el modelo pequeño | Nada |

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

No son estimaciones: salen de ejecuciones reales.

| Qué | Cuánto | Margen |
|---|---|---|
| Tokens por edición de 100 piezas | ~100.000 | **Justo el tope diario del modelo de 70B** |
| Tokens por edición de 8 piezas | ~5.900 | Sobrado |
| Tiempo de la acción con 100 piezas | ~8 min | Sobrado (el límite son 6 h) |
| Peticiones por minuto a Groq | 30 | Se espacian 2 s, unas 24/min |
| Fuentes que responden | 59 de 62 | Los `403` son estables |

**El margen más estrecho de todo el sistema es el cupo de tokens.** Al agotarse
se pasa solo al modelo pequeño, pero conviene saberlo antes de subir cupos.

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
npm test              # 17 pruebas del dominio y de la validación
npm run tipos         # sin errores de tipos
npm run edicion       # una edición real, ~8 min
npm run servir        # y mirarla en localhost:8731
```

Para el lector hay además un recorrido automatizado con el protocolo de Chrome
—43 comprobaciones, incluida la lectura sin conexión— que **no está en el
repositorio**. Es la pieza de verificación que falta por incorporar.
