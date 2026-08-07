# La documentación, por dónde empezar

Cada documento responde a una pregunta distinta. Si no sabes cuál abrir, busca
tu pregunta aquí.

| Tu pregunta | Documento |
|---|---|
| ¿Qué es esto y cómo lo arranco? | [../README.md](../README.md) |
| ¿Dónde está cada cosa en el código? | [estructura.md](estructura.md) |
| ¿Por qué está hecho así y no de otra forma? | [decisiones.md](decisiones.md) |
| ¿De dónde sale la información? | [fuentes.md](fuentes.md) |
| **Algo falla, ¿qué hago?** | [operacion.md](operacion.md) |
| ¿Qué IA usamos, qué cuesta y qué otras hay? | [alternativas-ia.md](alternativas-ia.md) |
| ¿Qué significa esta palabra? | [glosario.md](glosario.md) |

## El orden si empiezas de cero

1. **[README](../README.md)** — qué hace el proyecto, en dos minutos.
2. **[glosario](glosario.md)** — el vocabulario. Los mismos nombres se usan en
   el código, así que leerlo primero ahorra confusiones después.
3. **[estructura](estructura.md)** — las dos mitades: el circuito que genera la
   edición y el lector que la muestra.
4. **[decisiones](decisiones.md)** — 17 decisiones con su porqué y lo que se
   descartó. Es el documento más largo y el más útil para entender el proyecto.

## Cómo se mantiene esta documentación

Cada documento tiene un dueño claro:

- Cambias **cómo está organizado el código** → toca `estructura.md`.
- Tomas **una decisión de producto o arquitectura** → una entrada nueva en
  `decisiones.md`, con lo que se descartó y por qué.
- Añades, quitas o pones en cuarentena **una fuente** → `fuentes.md`.
- Encuentras **un fallo que costó diagnosticar** → `operacion.md`, en problemas
  conocidos. Ese documento vale por los fallos que evita repetir.
- Cambian **los cupos gratuitos o los precios por token** → `alternativas-ia.md`,
  y actualiza la fecha de comprobación de su cabecera.

Las decisiones no se borran cuando cambian: se reescriben diciendo qué se creía
antes y qué se sabe ahora. La decisión 14 es el ejemplo — pasó de Claude a Groq
y conserva los números que motivaron el cambio.
