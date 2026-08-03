# MindScrolling

Un feed vertical, como los reels de Instagram o los shorts de YouTube, pero con
contenido que suma: papers, artículos técnicos y trabajos clínicos, resumidos
para leerse en diez segundos.

La idea es aprovechar el enganche del scroll para algo que te deja algo:
aprender y enterarte de lo que importa en tus temas.

**Cada día se publica una edición nueva. Cuando se acaba, se acaba.**

## Estado

El circuito completo está montado —leer, deduplicar, puntuar, resumir,
publicar— y el catálogo tiene 123 fuentes, 62 de ellas leyéndose ya: 59 por RSS
y 3 preguntándole a Europe PMC, que es como se llega a PubMed y a AJOT.

## Temas que cubre

| Ámbito | Temas | Cupo diario |
|---|---|---|
| Técnico | IA, arquitectura de software, modelos de software | 4 |
| Clínico | Terapia ocupacional, integración sensorial, anatomía y fisiología | 3 |
| Gestión | Scrum y agilidad, gestión de proyectos, equipos y liderazgo | 1 |

Se compite dentro del ámbito, nunca entre ámbitos. Un cupo que no se llena no
se cede: la edición sale más corta y ya.

## Cómo funciona, en corto

1. Cada madrugada, un proceso automático lee las fuentes aprobadas.
2. Descarta lo repetido y puntúa lo que queda.
3. La IA escribe un resumen corto de lo seleccionado y marca las palabras clave.
4. Se publica la edición del día como un fichero.
5. Tu móvil se la descarga y la reordena según lo que sueles leer.

## Documentación

- [Glosario](docs/glosario.md) — las palabras que usamos y qué significa cada una.
- [Decisiones](docs/decisiones.md) — qué decidimos, por qué, y qué descartamos.
- [Estructura](docs/estructura.md) — cómo está organizado el código y por qué.
- [Fuentes](docs/fuentes.md) — el catálogo, qué se lee y qué no, y por qué.
