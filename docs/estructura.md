# Cómo está organizado el código

```
config/fuentes.json     de dónde leemos y qué temas seguimos
src/
  dominio/              lo que sabemos del problema
  infraestructura/      con quién hablamos para conseguirlo
  ejecutar.ts           el único sitio que decide quién es quién
ediciones/              lo que se publica cada día
web/                    lo que se ve en el móvil
```

## La única regla que importa

**`dominio/` no puede importar nada de `infraestructura/`.**

Al revés sí. Esa flecha va en un solo sentido y nunca al contrario.

Si algún día `dominio/` necesita importar algo de fuera, es que ese algo no era
infraestructura: era dominio mal colocado.

## Por qué se separa así

Mira lo que hay en cada carpeta:

**`dominio/`** — qué es una pieza, cómo se identifica, cómo se puntúa, cómo se
reparten los cupos. Nada de esto cambia si mañana lees de arXiv en vez de RSS,
o si resumes con Ollama en vez de con Claude. Es tu conocimiento del problema.

**`infraestructura/`** — leer un RSS, llamar a Claude, escribir un fichero.
Todo esto son decisiones que vas a cambiar, y cambiarlas no debería obligarte a
tocar lo de arriba.

## Los puertos

En `dominio/puertos.ts` hay tres contratos: buscar hallazgos, destilar una
pieza, publicar una edición.

Fíjate en cómo están escritos: en ninguno aparece la palabra RSS, ni Claude, ni
fichero. Están escritos **desde el problema**, diciendo qué se necesita, no
quién lo va a cumplir.

Esa es la diferencia entre un puerto y una interfaz cualquiera. Una interfaz que
copia la forma de una herramienta concreta no te protege de nada: si cambias la
herramienta, cambia la interfaz. Un puerto sobrevive al cambio.

## Por qué el dominio son funciones puras

Todo en `dominio/construirEdicion.ts` recibe una lista y devuelve una lista. Sin
red, sin ficheros, sin mirar el reloj — la fecha llega como argumento.

Dos consecuencias prácticas:

1. Se puede probar entero, en milisegundos, sin internet y con datos inventados.
2. El día que quieras cambiar la fórmula de puntuación, tienes red de seguridad.

## Ejecutar los tipos sin compilar

Node 24 ejecuta los ficheros `.ts` directamente: les quita los tipos y los
corre. No hay carpeta de compilación ni paso de construcción.

`npm run tipos` llama a TypeScript solo para comprobar que todo encaja. No
genera nada.
