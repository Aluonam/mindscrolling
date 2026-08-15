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

## El lector

Sin dependencias, sin construir nada, sin framework: se abre y funciona.

Por dentro sigue **atomic design**. Un átomo no sabe de nada; una molécula
compone átomos; un organismo es una pieza de interfaz completa; la plantilla es
la página.

```
web/
  index.html              la estructura, y el orden en que carga todo
  estilos/
    atomos/               variables, base, botón, palabra, enlace, grano
    moleculas/            procedencia, destilado, pie, segmentos, fila, guardado, filtros, aviso
    organismos/           cabecera, pieza, índice, detalle, acciones, velo, cierre, vacío
    plantillas/           el carril y «menos movimiento»
  guion/
    estado.js             lo que varios organismos comparten
    atomos/               ámbitos, palabras, texto, aviso, incidencias, guardados
    moleculas/            revelado, ritmo, segmentos, fila, guardado, velo
    organismos/           carril, cierre, cabecera, índice, detalle, acciones, ajustes, ondas
    lector.js             la página: carga la edición y conecta lo demás
```

**Los organismos no se conocen entre sí.** El carril no llama al índice para
que se repinte: cambia `estado` y avisa. Quien quiera enterarse, se suscribe
con `alCambiar`. Lo único que conoce a todos es `lector.js`.

En el CSS el orden de los `<link>` es la cascada: lo de abajo puede anular lo
de arriba. Son enlaces sueltos y no `@import` porque así se descargan en
paralelo y se sigue sin necesitar un paso de construcción.

Para verlo mientras trabajas: `npm run servir`. Abrir el fichero a doble clic
no vale — el lector pide la edición con `fetch`, y el navegador no deja hacer
peticiones desde un `file://`.

Lo único que el lector sabe del resto del proyecto es que hay un
`ediciones/ultima.json` con una fecha y una lista de piezas. No sabe de dónde
salieron ni quién las resumió, y por eso se puede rediseñar entero sin tocar
una línea de `src/`.

Si ese fichero todavía no existe, no falla: dice que aún no hay edición y
recuerda cómo generarla.

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

Eso ya no es una promesa: `npm test` corre las pruebas del dominio en menos de
dos décimas de segundo. Están en `construirEdicion.prueba.ts`, al lado del
fichero que prueban, y usan el corredor que trae Node — nada que instalar.

La regla no es «solo el dominio», es **se prueba lo que no necesita el mundo**.
Probar que un RSS se lee bien exige el RSS, y eso ya no es una prueba, es una
llamada a internet. Pero `validarDestilado` no necesita nada —ni red, ni
ficheros, ni reloj— y su fallo es silencioso: una clave que no aparece en el
texto no da error, simplemente no resalta nada. Por eso también se prueba.

## Ejecutar los tipos sin compilar

Node 24 ejecuta los ficheros `.ts` directamente: les quita los tipos y los
corre. No hay carpeta de compilación ni paso de construcción.

`npm run tipos` llama a TypeScript solo para comprobar que todo encaja. No
genera nada.

Esa comodidad tiene una regla que no es evidente: **quitar los tipos no es
compilar**. Las formas de TypeScript que *generan código* en lugar de solo
describirlo no sobreviven. La que nos mordió fue la propiedad de parámetro:

```ts
constructor(private readonly carpeta: string) {}   // no arranca
```

Hay que declarar el campo y asignarlo por separado. El `tsconfig` lleva
`erasableSyntaxOnly` justo para avisar de esto, y avisaba — pero
`npm run tipos` estaba en rojo por otras cosas y el aviso se perdió entre el
ruido. Mantener los tipos en verde es lo que hace que sirvan.
