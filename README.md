
# MindScrolling

Un feed vertical, como los reels de Instagram o los shorts de YouTube, pero con
contenido que suma: papers, artículos técnicos y trabajos clínicos, resumidos
para leerse en diez segundos.

La idea es aprovechar el enganche del scroll para algo que te deja algo:
aprender y enterarte de lo que importa en tus temas.

<img width="921" height="2048" alt="b5379417-9ead-4888-b609-ca53cd2e0b49" src="https://github.com/user-attachments/assets/966b3b12-2dd0-4870-af9a-118aec431d9d" />

**Cada día una edición nueva con 100 publicaciones.**

**Configura la letra y activa las ondas alfa para leer con facilidad.**

<img width="921" height="2048" alt="fedb48c8-225c-4a8a-883a-832741980f52" src="https://github.com/user-attachments/assets/3fdd75a0-2a2c-46b1-9fb0-869e6243078d" />

**Si te resulta interesante puedes leer un resumen amplio o ¡abrir la fuente!**

<img width="921" height="2048" alt="800632b2-fc19-4681-a302-ecd209427da8" src="https://github.com/user-attachments/assets/54678a14-bb1e-492d-bfab-c86b34576176" />




## Estado

El circuito completo está montado —leer, deduplicar, puntuar, resumir,
publicar— y el catálogo tiene 123 fuentes, 62 de ellas leyéndose ya: 59 por RSS
y 3 preguntándole a Europe PMC, que es como se llega a PubMed y a AJOT.

El lector ya es el de verdad, no un apaño para comprobar que la edición se lee:
revelado palabra a palabra con control de velocidad, un color por ámbito,
índice de la edición, selector de tipo de letra y ondas de fondo opcionales.

Los destilados los escribe Groq, cuyo plan gratuito cubre el consumo real de
una edición con mucho margen. **El proyecto no cuesta dinero.**

Queda automatizarlo: hoy la edición se genera a mano con `npm run edicion`.


## Temas

El administrador puede añadir fuentes nuevas de información:

<img width="921" height="2048" alt="74c5058e-c7fd-4d29-bad7-7583bcfb9f16" src="https://github.com/user-attachments/assets/1353ed87-d078-40ed-b6ef-bbe1c6b44f40" />


| Ámbito | Temas | Cupo diario |
|---|---|---|
| Técnico | IA, arquitectura de software, modelos de software | 4 |
| Clínico | Terapia ocupacional, integración sensorial, anatomía y fisiología | 3 |
| Gestión | Scrum y agilidad, gestión de proyectos, equipos y liderazgo | 1 |

Se compite dentro del ámbito, nunca entre ámbitos. Un cupo que no se llena no
se cede: la edición sale más corta y ya.

## Cómo funciona

1. Cada madrugada, un proceso automático lee las fuentes aprobadas.
2. Descarta lo repetido y puntúa lo que queda.
3. La IA filtra eliminando anuncios, escribe un resumen corto de lo seleccionado y marca las palabras clave.
4. Se publica la edición del día como un fichero.
5. Tu móvil se la descarga y la reordena según lo que sueles leer.

