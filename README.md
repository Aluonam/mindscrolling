
# MindScrolling

Un feed vertical, como los reels de Instagram o los shorts de YouTube, pero con
contenido que suma: papers, artículos técnicos y trabajos clínicos, resumidos
para leerse en diez segundos.

La idea es aprovechar el enganche del scroll para algo útil:
aprender y enterarte de los temas que te importan.

**Vista desde PWA** 
¡Instala en tu móvil!

<img width="461" height="1048" alt="b5379417-9ead-4888-b609-ca53cd2e0b49" src="https://github.com/user-attachments/assets/966b3b12-2dd0-4870-af9a-118aec431d9d" />

**Cada día una edición nueva con 100 publicaciones.**

**Configura la letra y activa las ondas alfa para leer con facilidad.**

<img width="461" height="1048" alt="fedb48c8-225c-4a8a-883a-832741980f52" src="https://github.com/user-attachments/assets/3fdd75a0-2a2c-46b1-9fb0-869e6243078d" />

**Si te resulta interesante puedes leer un resumen amplio o ¡abrir la fuente!**

<img width="461" height="1048" alt="800632b2-fc19-4681-a302-ecd209427da8" src="https://github.com/user-attachments/assets/54678a14-bb1e-492d-bfab-c86b34576176" />




## Estado

El circuito completo está montado —leer, deduplicar, puntuar, resumir,
publicar— y el catálogo tiene 125 fuentes. Puedes añadir más si eres administrador.

El lector revela palabra a palabra con control de velocidad, un color por ámbito,
índice de la edición, selector de tipo de letra y ondas alfa de fondo opcionales.

Los destilados los escribe Groq, cuyo plan gratuito cubre el consumo real de
una edición con mucho margen. **El proyecto no cuesta dinero.**


## Temas

El administrador puede añadir fuentes nuevas de información:

<img width="461" height="1048" alt="74c5058e-c7fd-4d29-bad7-7583bcfb9f16" src="https://github.com/user-attachments/assets/1353ed87-d078-40ed-b6ef-bbe1c6b44f40" />


| Infraestructura |

  ┌─────────┬───────────────────────────────────────────────────────────────────────────────────────┐
  │  Capa   │                                      Qué se usa                                       │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤                      
  │ Front   │ HTML + CSS + JS atomic design en carpetas PWA (manifest.json + service worker propio) │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Back    │ TypeScript + Node                                                                     │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Datos   │ Ficheros JSON en ediciones/, versionados en git. Sin base de datos                    │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ IA      │ Groq · openai/gpt-oss-120b (respaldo 20b).                                            │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Fuentes │ Customizables                                                                         │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Cómputo │ GitHub Actions, cron 03:00 UTC                                                        │
  ├─────────┼───────────────────────────────────────────────────────────────────────────────────────┤
  │ Hosting │ GitHub Pages                                                                          │
  └─────────┴───────────────────────────────────────────────────────────────────────────────────────┘

## Cómo funciona

1. Cada madrugada, un proceso automático lee las fuentes aprobadas.
2. Descarta lo repetido y puntúa lo que queda.
3. La IA filtra eliminando anuncios, escribe un resumen corto de lo seleccionado y marca las palabras clave.
4. Se publica la edición del día como un fichero.
5. Tu móvil se la descarga y la reordena según lo que sueles leer.

## Cómo puedes usarlo

Enlace de la PWA: **https://aluonam.github.io/mindscrolling/**

  Se instala desde el propio navegador: Chrome ⋮ → Añadir a pantalla de inicio; (en iOS desde Safari).
        
  ---

¿Quieres tu propio MindScrolling?

  1. Clave gratuita de Groq — console.groq.com, con cuenta de Google o GitHub. Sin tarjeta. Da 8.000 tokens/minuto y un cupo diario por clave. Una  
  edición de 100 piezas gasta ~138.000 tokens y tarda ~30 min.

  2. Fork del repo → Settings → Secrets and variables → Actions → GROQ_API_KEY.

  3. Activar Actions. Detalle importante: GitHub desactiva los workflows programados en los forks. Hay que entrar en la pestaña Actions, aceptar el 
  aviso y activar "Edición diaria" a mano.

  4. Pages → Settings → Pages → main / root. La URL pasa a ser https://TU-USUARIO.github.io/mindscrolling/.
