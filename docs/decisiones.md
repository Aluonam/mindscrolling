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

**Qué.** Los destilados los escribe Groq (`openai/gpt-oss-120b`) por defecto,
con `openai/gpt-oss-20b` de repuesto. Con `RESUMIDOR=claude` los escribe
Claude. Los tres comparten instrucciones.

**Por qué.** Porque es gratis y no pide tarjeta. El plan gratuito da 8.000
tokens por minuto, y una pieza gasta unos **1.400** —1.061 de entrada, 323 de
salida, de los cuales 239 son razonamiento—. Una edición de 100 sale por unos
138.000 tokens y tarda media hora, que es el ritmo que impone el límite por
minuto, no la velocidad del modelo.

**El detalle que costó una tarde:** Groq no descuenta del cupo del minuto lo
que gastas, sino lo que reservas —el prompt más el `max_tokens` entero—. Con
once segundos entre llamadas se pedían 13.000 tokens por minuto para gastar
4.600, y el 429 saltaba solo.

**Por eso el ritmo no es una constante.** Cada respuesta dice cuántos tokens
quedan en el cubo del minuto y cuánto tarda en rellenarse, y el adaptador se
pace con eso. Probamos antes dos esperas fijas —once segundos y dieciocho— y
las dos estaban mal: la primera se pasaba de rápida, la segunda frenaba los
días que había cupo de sobra. Cuando el proveedor publica su propio límite, no
hay que estimarlo.

**Lo que enseñó el apagón de agosto de 2026.** Groq retiró los Llama de Meta y
la API empezó a responder `404 model_not_found` a cada pieza. Dieciocho días
publicando ediciones vacías, con la acción en verde y el lector en blanco. De
ahí salen tres reglas que ahora están en el código:

- **Una edición vacía no se publica.** Cero destilados de cien finalistas no es
  un día flojo, es una avería. Se conserva la edición anterior y la acción
  falla, que es la única forma de enterarse.
- **Una edición corta sí se publica.** Si el cupo se agota en la pieza veinte,
  la edición del día son esas veinte. Producir menos es aceptable; no producir,
  no.
- **Al proveedor no se le pregunta cien veces lo mismo.** Cuando los dos
  modelos se quedan sin cupo, el ciclo cierra la edición en vez de recorrer las
  ochenta piezas restantes para recibir ochenta veces el mismo 429.

**Corrección de una cifra que estuvo mal, en tiempos de los Llama.** Durante un tiempo aquí puso que 100
piezas gastaban unos 100.000 tokens, «justo el tope». Era una extrapolación
desde la edición de ocho, no una medición, y sobrestimaba en un 22%. El
respaldo al modelo pequeño llegó a saltar, pero no por falta de capacidad: el
cupo es diario y compartido, y se había gastado probando a mano esa misma
tarde.

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
  gráfica dedicada, donde solo entra un modelo de 3B. Groq da un 120B gratis.
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

---

## 18. El modelo ve 2.000 caracteres de cada resumen, no 4.000

**Qué.** El material que se le manda por pieza se recorta a 2.000 caracteres
(`LIMITE_MATERIAL` en `instruccionesDestilado.ts`).

**Por qué.** Se sigue en el plan gratuito de Groq (decisión 14), así que el
cupo diario de tokens es el recurso escaso y la entrada es la parte gorda del
gasto: 73.656 de los 82.110 tokens de una edición. Con 4.000 el margen era del
18%, tan justo que probar a mano por la tarde dejaba la edición de esa noche a
medias en el modelo pequeño. La mayoría de resúmenes de paper caben enteros en
2.000, así que el recorte casi nunca llega a morder.

**Descartado, de momento: bajar a 1.200.** Da más margen todavía, pero ahí ya
se corta por la mitad un resumen normal y el modelo deja de ver la conclusión,
que suele ser justo lo que hay que destilar.

**Descartado: pagar.** Haiku 4.5 son 3,48 $ al mes y escribiría mejor, pero
choca con la restricción de coste cero — el proyecto no debe depender de una
tarjeta para funcionar.

**Cuándo revisarlo.** Si aparecen destilados a los que les falta el desenlace
del trabajo, el recorte se está quedando corto y hay que subirlo.

---

## 19. La edición se despide, y si salió coja lo dice

**Qué.** El carril termina en una pantalla propia: "Hasta aquí los reels de
hoy". Cuando la edición no salió entera —faltan piezas, o se agotó el cupo del
modelo bueno y terminó el de repuesto— esa misma pantalla lo cuenta. Y si la
edición que se está leyendo tiene más de un día, salta un aviso al abrir.

**Por qué.** Sesenta piezas y cien piezas se ven exactamente igual desde
dentro. Sin esto, un día malo se lee como un día flojo: quien lee no puede
distinguir "hoy había poco" de "hoy algo falló", y acaba desconfiando de la
aplicación en general en vez de saber qué pasó ese día concreto.

**Va con la decisión 10.** La edición diaria termina, y por eso el final se
puede marcar. Un feed infinito no tiene dónde poner esto.

**Cómo llega el dato.** El ciclo publica `incidencias` dentro de la edición:
cuántas piezas se pidieron, cuántas salieron y si se agotó el cupo. Solo eso —
lo que se le puede enseñar a una persona. Qué fuentes cayeron o qué modelo
escribió cada pieza se queda en el registro de la acción, que es donde sirve.

**Descartado: callarlo y ya.** Era lo que había. También descartado enseñar el
detalle técnico: "429 tokens per day" no es información para quien lee.

**El aviso de edición vieja salta a los dos días, no al día siguiente.** La
fecha se escribe en horario universal y se compara con la del teléfono, así que
una edición recién publicada puede parecer de ayer durante unas horas. Un aviso
que salta sin causa se aprende a ignorar en dos días.

---

## 20. Se van los votos; entran guardar y compartir

**Qué.** Desaparecen los botones de "muy relevante" y "poco relevante". La
barra inferior pasa a ser dos iconos en la esquina derecha: compartir y
guardar. Lo guardado es una lista de **enlaces al original**, y vive en el menú
lateral, en su propia pestaña junto a la edición del día.

**Sustituye en parte a la decisión 9**, que daba por hechos los dos botones de
voto. Lo demás de esa decisión sigue en pie: se aprende de lo que haces, no de
lo que pulsas.

**Por qué.** Los votos no alimentaban nada. Vivían en un `Map` en memoria, se
perdían al recargar, no salían del dispositivo y no reordenaban ninguna
edición. Ocupaban dos tercios de la barra prometiendo un aprendizaje que no
existía. Compartir y guardar hacen algo el mismo día que se pulsan.

**Y había un fallo de fondo.** El voto se guardaba por posición en el carril, y
el orden se baraja en cada apertura (decisión 10): el índice 7 de hoy no es la
pieza 7 de mañana. Persistirlos tal cual habría guardado ruido. Lo guardado se
identifica por su enlace, que sí es estable.

**Solo el enlace, no el destilado.** Va con la decisión 12: nuestro resumen
cumplió su función el día que salió; lo que quieres volver a encontrar es el
trabajo de otra persona.

**En `localStorage`, no en IndexedDB.** La decisión 5 decía IndexedDB para todo
lo que se guarda en el dispositivo. Para unas decenas de líneas de texto no
compensa: IndexedDB pide abrir, versionar y esperar. Tendrá sentido el día que
se guarden piezas enteras para leerlas sin conexión, y ese día se cambia solo
`atomos/guardados.js`.

**Sigue pendiente de la decisión 5:** un botón de exportar lo guardado a un
fichero. Ahora que hay algo que perder, hace más falta que antes.

---

## 21. La edición se escribe entrelazada, para que un corte no se lleve un ámbito entero

**Qué.** Las piezas se seleccionan por ámbito como siempre (decisión 7), pero
antes de escribirlas se intercalan: la edición ya no sale en bloques de 50
técnicas, 37 clínicas y 13 de gestión, sino repartida en esa misma proporción
de principio a fin.

**Por qué.** Porque la edición puede terminarse antes que la lista. Si el cupo
de tokens se agota en la pieza veinte, esas veinte son la edición del día
(decisión 14). En bloques serían veinte técnicas y ni una clínica; entrelazadas
son diez, siete y tres.

**Cómo.** A cada pieza se le da el sitio que ocupa dentro de su ámbito, de 0 a
1, y se ordena por ese sitio. La quinta de cincuenta técnicas y la cuarta de
treinta y siete clínicas caen juntas porque van igual de avanzadas en lo suyo.
La proporción se mantiene en cualquier punto donde se corte, y dentro de cada
ámbito no cambia nada: siguen del mejor al peor.

**Lo que no cambia: el orden de lectura.** El carril baraja la edición en cada
apertura (decisión 10), así que esto no altera lo que ves ni en qué orden. Solo
decide qué piezas llegan a escribirse el día que el cupo se queda corto.

---

## 22. Una edición corta se completa con las anteriores, y se dice cuáles

**Qué.** Si hoy no se llega a las 100 piezas previstas, el hueco se rellena con
las de la edición anterior que no hayan vuelto a salir. Las nuevas van primero;
las heredadas después, y cada una lleva al lado de su fuente la fecha del día en
que se escribió.

**Por qué.** La decisión 14 dice que una edición corta se publica antes que
perder el día, y eso sigue en pie: el ciclo escribe hasta donde llega el cupo.
Pero publicar veinte piezas deja un carril que se acaba en veinte deslizamientos,
y el formato es un reel: si se acaba enseguida, no hay edición que valga.
Releer algo de ayer es mejor que quedarse sin nada que leer.

**La herencia es en cadena.** Una pieza heredada puede volver a heredarse al día
siguiente, así que en una sequía larga el carril sigue lleno con lo más reciente
que haya. Se eligió esto sabiendo lo que cuesta: una pieza puede arrastrarse
varios días. La alternativa —heredar solo una vez— dejaba el carril corto al
segundo día malo, que es justo lo que esto viene a evitar.

**Por eso la marca no es opcional.** Si el contenido puede arrastrarse, quien lee
tiene que poder saber de cuándo es cada cosa sin abrir nada. La fecha aparece
junto a la fuente, apagada y en una píldora: informa, no interrumpe. Y como la
pieza guarda su fecha de origen y no la de la edición por la que pasó, dice la
verdad por muchos saltos que haya dado.

**Lo que no se hereda: una edición vacía.** Si hoy no se escribe ninguna pieza,
no se publica nada y se conserva la anterior entera (decisión 14). Republicar lo
de ayer con la fecha de hoy sería fingir que el ciclo funcionó.

---

## 23. Los anuncios se tiran antes de resumirlos, no después

**Qué.** Antes de puntuar nada, se descartan las piezas que son publicidad. Se
reconocen por tres señales, de la más fiable a la menos: la categoría que el
propio medio pone, la carpeta donde archiva la pieza y la fórmula del título.

**Por qué.** Los medios de tecnología viven en parte de la afiliación y sus
feeds no separan lo que informa de lo que vende: por el mismo canal llegaba un
análisis de arquitectura y «Instacart Promo Code: $15 Off». Sobre el catálogo
entero salen 36 anuncios al día, 29 solo de Wired. No es un problema de gusto:
cada uno se llevaba unos 1.400 tokens del cupo diario para escribir el resumen
de un cupón.

**Por eso va antes del embudo y no después.** Filtrar al final habría dejado el
feed limpio igual, pero pagando. Aquí no llega ni una a la IA.

**La regla al escribir los patrones: ante la duda, se deja pasar.** Colar un
anuncio cuesta unos tokens; tirar un trabajo clínico bueno porque su título
mencionaba un precio no se nota hasta que alguien lo echa de menos. Dos reglas
de la primera versión se cayeron por eso:

- «Black Friday» en el título descartaba *How to make your next Black Friday
  stress-free*, de Thoughtworks, que va de aguantar un pico de tráfico.
- «up to 40%» descartaba *Databricks ❤️ Hugging Face: up to 40% faster
  training*, que habla de velocidad y no de dinero.

Las dos están en las pruebas, para que no vuelvan.

---

## 24. El texto de los feeds se limpia decodificando y quitando, en ese orden y dos veces

**Qué.** Al leer un feed, el texto se pasa por un ciclo que decodifica las
entidades y quita las etiquetas, repitiendo mientras algo cambie.

**Por qué.** Se veía en pantalla y de dos formas distintas:

1. **Etiquetas escapadas.** Muchos feeds mandan «&lt;p&gt;» en vez de «<p>».
   Quitando etiquetas antes de decodificar no había nada que quitar, y la
   decodificación las devolvía después: el lector enseñaba «<span class=...» al
   ampliar una pieza. Diez de las treinta y una de una edición salieron así.
2. **Entidades numéricas.** Se decodificaban seis a mano —`&lt;`, `&gt;`,
   `&quot;`, `&#39;`, `&nbsp;`, `&amp;`— y las demás llegaban crudas al
   título: «&#8216;Dragon Ball&#8217;», «&#8230;», «&#x27;». Más de mil sobre
   el catálogo entero.

**El orden importa y el final también.** Primero decodificar, para que haya
etiquetas que quitar; y terminar quitando, no decodificando, o un
«&amp;lt;p&amp;gt;» dejaría la etiqueta puesta. Hay feeds que escapan dos veces:
tras una sola pasada quedaban 372 «&quot;» y 116 «&lt;».

**Lo que no se quita: los signos de menor y mayor sueltos.** El patrón solo
reconoce como etiqueta un «<» seguido de letra o de barra. Con un `<[^>]+>` a
secas, un resumen clínico con «p < 0,05 y n > 30» perdía el trozo de en medio.
La estadística importa más que apurar la limpieza.

---

## 25. Lo que no toca ingeniería informática o neurodiversidad no entra

**Qué.** Una pieza que no encaja con ningún interés del catálogo se descarta,
por buena que sea su fuente y por reciente que sea. Y los términos se comparan
como palabras, no como trozos de palabra.

**Por qué.** La fórmula daba hasta 0,45 de 1 solo por autoridad y frescura, sin
tocar el tema. Con eso entraban «Dragon Ball Super regresa con el tráiler de su
nuevo anime» y notas de prensa de patronales, compitiendo con trabajos que sí
venían al caso. El proyecto va de dos cosas; una pieza que no toca ninguna no
hace la edición más variada, la hace peor.

**Dos fallos que lo tapaban, y son los interesantes:**

- **El vocabulario estaba solo en inglés** y media web del catálogo publica en
  castellano y en catalán. Un trabajo sobre autismo puntuaba cero y perdía
  contra cualquier cosa. Ahora los términos van en los tres idiomas.
- **No había ni una palabra sobre neurodiversidad.** Ni «autismo», ni «TDAH»,
  ni «neurodivergente». El tema central del lado clínico no estaba escrito en
  ninguna parte, así que el sistema no podía reconocerlo.

**Y «design» era el término que colaba el traje espacial.** «NASA is changing
lunar spacesuit design» encajaba con el interés de arquitectura de software.
Se han caído los términos que entran en cualquier titular —«design», «team»,
«risk», «delivery», «culture»— y los que quedan son expresiones completas.

**Los límites de palabra van solo al principio.** «rendimiento» encajaba dentro
de «emprendimiento» y colaba una nota de prensa. Pero el límite no se pone al
final a propósito: así «autism» sigue encontrando «autismo» y «sensor»
encuentra «sensorial», que es lo que se le pide a un término en inglés sobre un
catálogo que publica en tres idiomas.

**Dónde se paga.** En `config/fuentes.json`, no en el código. Si algo bueno se
cae, es que le falta el término. Es el sitio correcto: el criterio de qué
interesa es de quien lee, no del programa.

---

## 26. El catálogo se toca desde el móvil, y el panel no disimula lo que cuesta

**Qué.** Un panel dentro de la aplicación lista las 123 fuentes, dice cuántas
piezas ha puesto cada una en lo que estás leyendo, deja encenderlas y apagarlas,
y añadir webs nuevas. Se abre desde la pestaña «Fuentes» del menú, junto a
Edición y Guardados.

**Estuvo escondido tras cinco toques en el sello, y duró un día.** La primera
versión escondía la entrada a propósito. No la encontró nadie —ni buscándola— y
el panel entero valió para nada. Esconder una pantalla no la protege: solo la
hace inútil. Lo que la protege es que sin identificarse no se ve.

**Por qué.** Lo que se ha visto usándolo es que el filtro que de verdad importa
no es el de los términos, es el de las fuentes. El mapa de cuántos bares hay en
España no entró por un término mal elegido —«base de datos» es tan técnico como
el que más—, entró porque venía de un medio generalista (decisión 25). Y esa
decisión se toma leyendo, no delante del editor de código.

**Lo que el panel no esconde: son dos efectos distintos.**

- **Apagar una fuente aquí** la esconde en lo que estás leyendo, al momento y
  solo en este dispositivo.
- **Publicar el catálogo** hace que la acción de la madrugada deje de leerla, y
  ahí es donde se dejan de gastar tokens.

Esa distancia es de la arquitectura: la aplicación es estática y el navegador
no puede escribir en el repositorio. El panel lo dice en el resumen —«2 cambios
sin publicar»— en vez de fingir que apagar algo ya lo arregla.

**Dos caminos para publicar, y el bueno no pide credenciales.** Sin credencial,
el panel copia el fichero entero al portapapeles y lo pegas en
`config/fuentes.json`. Con una credencial de GitHub, publica desde el propio
móvil. La credencial se guarda en `localStorage` y solo viaja a
`api.github.com`; conviene que sea un token preciso, limitado a este
repositorio y con permiso de Contenido. Si el móvil se pierde, lo que está en
juego es editar un repositorio público que ya se puede leer entero, y se revoca
desde la web de GitHub.

**El panel se ve, pero no manda.** Esta aplicación es pública y el código
también: esconder el panel es comodidad, no seguridad. Lo que separa a quien
puede cambiar el catálogo de quien no es la credencial, que no está aquí.

**Se esconde lo que TÚ has apagado, no todo lo que el catálogo tenga sin
aprobar.** El catálogo solo se descarga al abrir el panel; si el lector mirara
el catálogo entero, escondería cosas distintas según hubieras abierto el panel
o no. Una lista que cambia sola es peor que una lista incompleta. Lo que ya
está descartado en el repositorio no necesita esconderse: mañana no vendrá.

---

## 27. La contraseña la comprueba un portero, no el navegador

**Qué.** El panel de fuentes pide usuario y contraseña. Los comprueba un
servicio mínimo en Cloudflare Workers —`servicio/worker.js`, unas doscientas
líneas— que además guarda el token de GitHub. Ni la contraseña ni el token
están en este repositorio.

**Por qué no se puede comprobar en el navegador.** El lector es una web
estática y su código se descarga entero en el móvil de quien la abre. Una
contraseña escrita en el código la lee cualquiera, y un `if (clave === '…')`
se salta con la consola abierta. No es que sea difícil de proteger: es que no
hay nada que proteger, porque todo lo que hace el navegador lo controla quien
tiene el navegador.

**Y por qué eso importaba aquí y no en otras pantallas.** Lo que hay detrás del
panel no es contenido, es escribir en el repositorio. Sin portero solo había
dos caminos y los dos malos: el token de GitHub dentro de la aplicación —y
entonces cualquiera podría cambiar las fuentes— o el token pegado a mano en
cada dispositivo, que es seguro pero no funciona «en el móvil que sea».

**Con el portero, la contraseña viaja y el token no.** El token vive cifrado en
los secretos de Cloudflare y solo lo usa ese código, en el servidor. Se puede
leer el repositorio entero sin encontrar ni la contraseña ni el token.

**Detalles que no son adorno:**

- **La comparación tarda lo mismo acierte o falle.** Con un `===` normal se
  puede adivinar una contraseña letra a letra midiendo cuánto tarda en
  contestar.
- **No se dice cuál de los dos está mal.** «El usuario o la contraseña no son
  correctos» no regala la mitad del trabajo a quien esté probando.
- **La sesión no se guarda en ninguna parte.** Es una fecha de caducidad
  firmada: el servicio no tiene memoria entre peticiones, y para inventarse una
  haría falta el secreto de firma, que no sale de Cloudflare.
- **Solo acepta llamadas desde el lector.** Sin esa lista, cualquier web podría
  montar un formulario contra el servicio y probar contraseñas desde el
  navegador de quien la visitara.
- **La contraseña se borra del campo en cuanto entra.** No se queda escrita en
  una pantalla que puede quedarse abierta.

**Si el servicio desaparece no se pierde nada más que el panel.** La edición de
cada día la genera GitHub Actions por su cuenta y no sabe que esto existe.

---

## 28. Para añadir una fuente se pega una dirección, y contesta qué le falta

**Qué.** Un formulario con la dirección de la web. Si sirve, entra en el
catálogo; si no, dice por qué en frases, no en códigos de error.

**Por qué lo comprueba una acción y no el navegador.** El navegador no puede
leer webs ajenas: lo impide él mismo. Así que el formulario lanza la acción
«Probar una fuente» con la credencial que ya tienes, y espera su informe. Es el
mismo motivo por el que el catálogo se publica por la API en vez de escribirse
directamente.

**Qué se comprueba, y qué no.** No si la web es buena —eso lo decide una
persona leyendo— sino si es utilizable: que publique un feed, que traiga al
menos tres entradas, que esas entradas traigan resumen y no solo el titular,
que las fechas sirvan y que haya publicado algo en los últimos seis meses.

**Los motivos se distinguen, porque piden cosas distintas.** No responder, no
publicar feed, y publicarlo pero no dejarlo leer son tres cosas. Lo último le
pasa a Nature, que declara su RSS en la cabecera y luego sirve una pantalla
antirrobots; con un «no se encuentra ningún feed» nadie sabría qué hacer.

**El parser es el mismo que el de cada día.** Se sacó a `hallazgosDe` para
eso: con dos parsers, el día que se arregle uno el otro sigue roto — que es
exactamente lo que pasó con las entidades HTML (decisión 24).
