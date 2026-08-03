# El catálogo de fuentes

123 fuentes en `config/fuentes.json`. Todas comprobadas una por una contra la
red antes de darles estado: ninguna está aprobada de oído.

| Estado | Cuántas | Qué significa |
|---|---|---|
| aprobada | 64 | Se lee cada madrugada: 61 por RSS verificado, 3 preguntando a Europe PMC. |
| candidata | 51 | Está en el catálogo, no aporta piezas. Falta un adaptador o una vía de acceso. |
| cuarentena | 8 | Merece la pena pero ahora mismo no se puede alcanzar. |

Por ámbito: 56 clínicas, 42 técnicas, 25 de gestión. Aprobadas, el reparto es
más desigual: 37 técnicas, 19 clínicas, 8 de gestión. Lo técnico publica mucho
más y con mejores canales, y por eso los cupos son por ámbito y no un ranking
único — sin esa separación, la edición sería técnica todos los días.

## Por qué la mitad no se lee

No es dejadez. Son cuatro problemas distintos y cada uno pide una solución
distinta.

**No tienen feed, son buscadores.** PubMed, PMC, Cochrane, Google Scholar,
Scopus, Web of Science, Semantic Scholar, SciELO, OTseeker. No publican: se
consultan. Un buscador no tiene "lo nuevo de hoy", tiene resultados para una
pregunta. Necesitan un adaptador que haga la pregunta, no que lea un feed.
*Resuelto para PubMed — ver [Europe PMC](#preguntar-en-vez-de-leer-europe-pmc).*

**Bloquean al robot con un 403.** AJOT, NINDS, PMI, ProjectManagement.com,
Physiopedia, Scrum.org, SciELO. Contenido público, acceso automático cerrado.
Aquí no hay truco técnico que valga la pena: o se pide acceso, o se lee a mano.

**Muro de pago.** NEJM, The Lancet, Neurology, ScienceDirect, HBR, MedBridge,
LinkedIn Learning. Los tres primeros están aprobados igualmente porque el feed
da titular y resumen, que para una pieza de diez segundos puede bastar — pero
el enlace lleva a algo que quizá no se pueda abrir.

**La web ya no existe.** Ocho fuentes, y siete son colegios profesionales de
terapia ocupacional en España.

## Los colegios españoles

De los diez del listado, uno funciona.

| Colegio | Estado |
|---|---|
| COTOC (Catalunya) | Aprobada — web y feed vivos, publica en catalán |
| COPTOA (Andalucía) | Candidata — web viva, sin feed |
| COPTOCAM (Madrid) | Cuarentena — el dominio resuelve pero falla el certificado |
| Consejo General, COPTOCV, COTOGA, COPTOCYL, EOTEO, COPTOAR, COPTOMU | Cuarentena — el dominio no resuelve |

Que el **Consejo General** —el órgano estatal de la profesión— tenga el dominio
caído dice bastante del estado de la digitalización del sector. Es exactamente
el hueco que este proyecto mira de reojo.

Hay que localizar las webs vigentes a mano, colegio por colegio.

## Lo que se vio al probarlo

Ensayo real con las 61 aprobadas: **todas respondieron**, 7.908 hallazgos en
bruto, 9 piezas finalistas. El circuito entero funciona.

Pero la edición salió así:

```
[tecnico] arXiv cs.AI     [clinico] Frontiers in Neurology
[tecnico] arXiv cs.AI     [clinico] bioRxiv
[tecnico] arXiv cs.AI     [clinico] Frontiers in Human Neuroscience
[tecnico] arXiv cs.LG     [gestion] Age of Product
                          [gestion] Mountain Goat Software
```

**Las cuatro técnicas son arXiv, y tres son del mismo canal.** No es un fallo
del código: es lo que pasa cuando una fuente publica 250 cosas al día y las
demás cinco. arXiv gana por volumen, no por ser mejor.

Con 61 fuentes esto ya no es teórico. Falta una regla de variedad —como máximo
una pieza por fuente y día, o algo parecido— pero eso es cambiar cómo se
selecciona, y va en su propia rama.

## Preguntar en vez de leer: Europe PMC

Algunas fuentes no publican nada; se consultan. `BuscadorEuropePmc` cubre ese
caso preguntándole a la API abierta de Europe PMC, que indexa a las cuatro que
nos interesaban y no pide clave.

En el catálogo, esas fuentes llevan `consulta` en lugar de `rss`. El puerto
`BuscadorDeHallazgos` no cambió ni una línea: seguía diciendo "alguien capaz de
decirme qué hay nuevo en una fuente", sin nombrar RSS. Por eso el adaptador
nuevo entró al lado del viejo sin tocar el dominio.

| Fuente | Consulta | Rinde |
|---|---|---|
| PubMed | `SRC:MED` + los temas del proyecto | ~550/mes |
| AJOT | `JOURNAL:"The American journal of occupational therapy"` | 38 en 150 días |
| J. NeuroEngineering and Rehabilitation | `JOURNAL:"..."` | 19/mes |

**AJOT es la ganancia gorda.** Su web contesta 403 a cualquier robot, pero
Europe PMC la indexa, así que por ahí sí se llega. Es la revista de referencia
de la profesión y estaba fuera del alcance.

Con una trampa: tarda de uno a tres meses en aparecer indexada. Con la ventana
normal de 30 días devolvía **cero** — aprobada y muda, que es el peor estado
posible. Por eso una fuente puede pedir su propia ventana con `diasAtras`; AJOT
usa 150.

### Las que se quedaron fuera, y por qué

Probadas y descartadas con datos, no por pereza:

- **PMC** como fuente aparte (`SRC:PMC`): 0 en 30 días, 170 en 120. Casi todo lo
  suyo ya entra por `SRC:MED`. Añadirla solo duplicaría.
- **BioMed Central** por editorial (`PUBLISHER:"BioMed Central"`): 357 al año
  pero 0 en 120 días. El campo va con demasiado retraso. La vía buena es revista
  a revista, como se hizo con J. NeuroEngineering.
- **Semantic Scholar**: su API es abierta, pero el cupo sin clave está agotado de
  forma permanente — 6 de 6 llamadas rechazadas con 429 esperando 4 segundos
  entre una y otra. Sirve pidiendo una clave gratuita; sin ella, no.
- **SciELO por OAI-PMH**: probadas cuatro direcciones (`scielo.org`, `scielo.br`,
  `old.scielo.br`, `search.scielo.org`). Dos 404, un 403 y un certificado
  inválido. Ninguna sirve.

### Lo que no se hizo

**n8n**: no resuelve ningún 403 ni inventa feeds donde no los hay, y a cambio
mueve la lógica de decidir a un editor visual donde no se puede probar. La hora
la da GitHub Actions.

**E-utilities del NCBI** directo: funciona, pero Europe PMC ya da lo mismo con
menos fricción y un solo adaptador para cuatro fuentes.

## Cómo mantener esto

Cuando una fuente cambie de dirección o se caiga:

1. Cambiar su `estado` a `cuarentena` y escribir en `nota` qué pasó.
2. No borrarla. El catálogo también sirve para recordar lo que se intentó.
3. Una fuente **no puede estar `aprobada` sin `rss`**. `ejecutar.ts` lo
   comprueba al arrancar y falla en voz alta si ocurre — si no, la fuente
   simplemente dejaría de aparecer y nadie se enteraría.

Los campos `categoria`, `web` y `nota` son para las personas que mantienen el
catálogo. No entran en la puntuación.
