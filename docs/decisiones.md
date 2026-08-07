# Decisiones

Cada decisión trae **qué** decidimos, **por qué**, y **qué descartamos**. Lo
último es lo más valioso: dentro de seis meses, cuando alguien —probablemente
tú— proponga la alternativa descartada, aquí está el motivo por el que ya se
miró y se dejó pasar.

Una decisión no se borra. Si cambia, se añade otra debajo que diga que sustituye
a la anterior.

---

## 1. Sin base de datos

**Qué.** La edición del día es un fichero que se regenera entero cada
madrugada. No hay servidor de base de datos.

**Por qué.** Una base de datos existe para consultas impredecibles y escrituras
simultáneas. La edición no tiene ninguna de las dos: se calcula una vez y no la
toca nadie en 24 horas. Un dato que cambia una vez al día no es un dato vivo, es
un artefacto que se regenera una vez al día.

**Descartado.** Postgres o Supabase desde el principio. Se puede añadir después
cambiando solo la pieza que lee el catálogo, sin tocar el resto.

**Cuándo revisarlo.** Si hace falta buscar texto completo en el servidor, si
aparecen cuentas de usuario con sincronización entre dispositivos, o si el
índice crece tanto que descargarlo molesta.

---

## 2. Frescura diaria, no en tiempo real

**Qué.** El ciclo se ejecuta una vez al día.

**Por qué.** Lo que da frescura es la frecuencia del ciclo, no la tecnología de
almacenamiento. Si algún día hace falta frescura por horas, se ejecuta cada
hora y sigue sin haber base de datos.

---

## 3. Curar fuentes, no artículos

**Qué.** El feed diario se alimenta solo de fuentes elegidas y aprobadas. La
búsqueda sirve para **descubrir fuentes nuevas**, no para llenar la edición.

**Por qué.** Lo que sale arriba en una búsqueda está arriba porque alguien
optimizó para que estuviera arriba. Si la señal de relevancia fuera "salió alto
en la búsqueda", estaríamos heredando el ranking de otro y reproduciendo el
mismo ruido del que queremos escapar.

**Principio general.** La calidad se controla en la frontera de entrada, no
filtrando después. Filtrar basura a posteriori es una carrera que siempre se
pierde.

---

## 4. Instagram queda fuera

**Qué.** No se ingiere contenido de Instagram.

**Por qué.** No hay vía legítima: su API solo da acceso a cuentas propias, y no
existe forma pública de descubrir contenido ajeno por tema. Lo único que
funcionaría es scraping, que incumple sus condiciones, se rompe cada pocas
semanas y acaba con la IP bloqueada. Choca de frente con la restricción de que
esto no puede exigir mantenimiento constante.

**Compensación.** Quien publica cosas interesantes en Instagram casi siempre las
publica también en un blog, un canal o un paper. Instagram es el escaparate,
rara vez la fuente.

---

## 5. Los datos personales no salen del dispositivo

**Qué.** Intereses aprendidos, piezas leídas, votos y guardados viven en el
móvil, en IndexedDB. No hay cuentas ni login.

**Por qué.** Resuelve de golpe privacidad, RGPD, coste de infraestructura y
complejidad de autenticación. Nada de eso hay que construirlo si el dato nunca
sale de casa.

**Consecuencia a vigilar.** Si se borran los datos del navegador, se pierden.
Hace falta un botón de exportar los guardados a un fichero.

---

## 6. La personalización va en dos fases

**Qué.**
- De madrugada, el proceso automático filtra con tus **intereses declarados** y
  publica la edición.
- En el móvil, la aplicación reordena esa edición con tu **perfil aprendido**.

**Por qué.** El proceso que calcula no sabe qué has pulsado, y el dispositivo
que sabe no puede calcular de madrugada. La salida es partir el trabajo según lo
que cambia poco (tus temas, tus fuentes) y lo que cambia constantemente (tu
comportamiento).

**Descartado.** Subir el perfil al servidor. Traería login, base de datos y
datos personales fuera del dispositivo, a cambio de nada que no consigamos así.

---

## 7. Cupos por ámbito, no ranking global

**Qué.** Cada ámbito tiene su cupo en la edición. Las piezas compiten dentro de
su ámbito, nunca entre ámbitos.

**Por qué.** arXiv publica unos cien papers de IA al día; de integración
sensorial salen unos pocos a la semana. Con un ranking único, lo técnico se come
la edición entera y lo clínico no aparece nunca — no por ser peor, sino por ser
cien veces menos.

**Regla que va con ella.** Un cupo que no se llena **no se cede** a otro ámbito.
Se rellena bajando el listón de frescura dentro del mismo ámbito, que además
encaja con que en lo clínico la caducidad es más lenta.

---

## 8. Gana la relevancia, con una reserva para explorar

**Qué.** Cuando choquen relevancia y variedad, gana la relevancia. Pero entre un
10 % y un 15 % de cada edición se reserva a piezas fuera del perfil aprendido.

**Por qué.** Optimizar solo relevancia se colapsa: el feed enseña lo que ya
gusta, se confirma, se estrecha, y en dos meses no enseña nada nuevo. Eso ataca
el objetivo del proyecto, que es aprender.

**Regla que va con ella.** Saltarse una pieza de exploración penaliza menos. Si
no, la exploración se mata a sí misma en dos semanas, porque ninguna fuente
nueva llega a demostrar nada.

---

## 9. El sistema aprende sobre todo de lo que haces, no de lo que pulsas

**Qué.** Hay botones de "muy relevante" y "poco relevante", pero el aprendizaje
principal viene de señales implícitas: abrir el original, llegar al final del
destilado, saltar rápido.

**Por qué.** En un feed de scroll, la gente casi no pulsa botones. Si el
aprendizaje dependiera solo de eso, en un mes habría treinta datos.

**Orden de trabajo.** Primero la reputación de las fuentes (pocas fuentes, mucha
información por señal). Después el peso de los intereses. El perfil semántico,
más adelante y solo cuando haya datos reales.

**Salvaguardas.** Acotar los pesos para que ninguno se dispare, y poner un suelo
a los intereses declarados: tu decisión consciente pesa más que la estadística
de una mala racha.

---

## 10. El formato es un reel de texto

**Qué.** Pantalla completa, vertical, una pieza por pantalla. El texto aparece
palabra a palabra al ritmo de lectura. Se toca para pausar.

**Por qué.** Parece vídeo pero por dentro es texto: sin ficheros pesados, sin
coste y sin esperas.

**Detalles que vienen de estudiar cómo enganchan TikTok e Instagram:**
- El destilado empieza por lo sorprendente, no por el contexto.
- Las primeras palabras aparecen deprisa y luego baja al ritmo de lectura.
- El orden se baraja: nunca va de mejor a peor.
- La señal que más importa es cuánto lees, no cuánto votas.

**Lo que NO copiamos, a propósito: el feed infinito.** Es el mecanismo más
potente de todos y es exactamente aquello de lo que este proyecto quiere
escapar. La edición diaria termina.

---

## 11. Las palabras clave las marca la IA

**Qué.** El destilado no es texto plano: lleva marcadas dentro las palabras
clave, y las marca la IA al escribirlo.

**Por qué.** En una pantalla de lectura rápida, resaltar dos o tres términos
guía el ojo y permite captar la idea sin leerlo todo. Quien mejor sabe cuáles
son es quien acaba de escribir el resumen.

---

## 12. Compartir envía el original

**Qué.** El botón de enviar comparte el enlace a la fuente original, nunca
nuestro destilado.

**Por qué.** Es lo correcto con el autor y lo correcto legalmente. El resumen es
obra nuestra y se queda en la aplicación; el mérito y las visitas van a quien
escribió el trabajo.

---

## 13. Alojamiento gratuito en GitHub Pages

**Qué.** La aplicación y las ediciones se publican en GitHub Pages. El ciclo
diario se ejecuta con GitHub Actions.

**Por qué.** Gratis en repositorios públicos, con `https`, que es lo que hace
falta para instalar la aplicación en el móvil. Y es el mismo sitio donde ya vive
la edición del día.

**Descartado.** Un dominio propio. Cuesta unos 10 € al año, no aporta nada
todavía y se puede añadir después sin tocar nada.

---

## 14. Los resúmenes se hacen con Groq, y con Claude para comparar

**Qué.** Los destilados los escribe Groq (`llama-3.3-70b-versatile`) por defecto.
Con `RESUMIDOR=claude` los escribe Claude. Ambos comparten instrucciones.

**Por qué.** El plan gratuito de Groq da 100.000 tokens al día en el modelo de
70B. Una edición de ocho piezas gasta unos 5.900, medidos sobre una edición
real. Cabe con margen incluso multiplicando el cupo por diez.

**Regla de diseño.** La operación cara va al final del embudo: el proceso reduce
cientos de candidatos con reglas gratuitas, y la IA solo resume lo que ha
sobrevivido.

**Lo que costaba antes.** Medido, no estimado: 5.207 tokens de entrada y 674 de
salida por edición. Al mes son 1,29 $ con `claude-opus-5` y 0,26 $ con
`claude-haiku-4-5` — bastante menos que los 4 € que decía esta decisión. El
dinero nunca fue la razón para irse; la razón es no depender de una tarjeta
para que el proyecto funcione.

**Claude se queda.** No como gasto fijo, sino como vara de medir: cuando haya
duda sobre la calidad de un destilado, se genera la misma edición con los dos y
se compara. Por eso las instrucciones viven en `instruccionesDestilado.ts` y no
dentro de cada adaptador — con reglas distintas, comparar no significa nada.

**Alternativas a evaluar, no descartadas:**
- **Ollama** — modelos en local, coste cero y sin límite de peticiones. Se
  descarta de momento por hardware: la máquina de trabajo es un Intel N95 sin
  gráfica dedicada, donde solo entra un modelo de 3B. Groq da un 70B gratis.
- **yt-dlp** — permite sacar los subtítulos de un vídeo sin descargarlo, y con
  eso los vídeos también tendrían destilado. YouTube bloquea a menudo las IPs de
  servidores, así que hay que tratarlo como algo que a veces falla.

Todas son piezas intercambiables detrás del mismo puerto. Probarlas no cambia
la arquitectura: es un fichero nuevo y una línea en `ejecutar.ts`.

---

## 15. La aplicación es accesible por defecto

**Qué.** Tipografía muy legible, texto aireado, opción de cambiar de letra,
control de velocidad de lectura y respeto por la preferencia de "menos
movimiento" del sistema.

**Por qué.** No es un extra. Es el requisito de la persona que la va a usar cada
día.

---

## 16. Un color por ámbito, y el tercero es verde

**Qué.** Cada ámbito tiñe la pieza entera: azul `#5AB4FF` lo técnico, ámbar
`#FFB454` lo clínico, verde `#6FDCA0` lo de gestión.

**Por qué.** El color dice de qué va la pieza antes de leer una palabra, y es
lo que hace visible que la aplicación cruza dos mundos que normalmente no se
tocan.

**Por qué verde y no violeta.** El prototipo solo tenía dos ámbitos. Al añadir
el tercero, el violeta era la opción bonita, pero se confunde con el azul en
una pantalla oscura y con más razón si quien mira no distingue bien esos tonos.
El verde se separa de los otros dos por sí solo.

---

## 17. Ampliar enseña el resumen del autor, no otro destilado nuestro

**Qué.** El segundo nivel de lectura muestra el título y el resumen originales
del trabajo, marcados como suyos y no como nuestros.

**Por qué.** Es el escalón que faltaba entre nuestro destilado de diez segundos
y el trabajo entero. Escribir un segundo resumen propio costaría otra llamada a
la IA para decir con nuestras palabras algo que el autor ya dijo con las suyas
— y va en la misma dirección que la decisión 12: cuanto más te acercas, más se
oye al autor y menos nosotras.
