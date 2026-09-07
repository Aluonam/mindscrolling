# El portero

Comprueba tu contraseña y guarda la llave de GitHub, para que puedas editar las
fuentes desde cualquier dispositivo sin que nadie más pueda.

## Por qué hace falta

El lector es una web estática: su código se descarga entero en el móvil de
quien la abre. Todo lo que esté ahí dentro es público, incluida una contraseña
escrita en el código y una llave de GitHub.

Sin este servicio solo había dos caminos, y los dos malos:

- La llave de GitHub en la aplicación → **cualquiera podría editar las fuentes.**
- La llave pegada a mano en cada dispositivo → segura, pero no funciona «en el
  móvil que sea».

Con el portero, **la contraseña viaja y la llave no**. La llave vive cifrada en
Cloudflare y solo la usa este código, en el servidor. Aunque alguien lea todo
el repositorio, no encuentra ni la contraseña ni la llave.

## Montarlo (una vez, unos diez minutos)

**1. Cuenta de Cloudflare.** Gratis y sin tarjeta, en `dash.cloudflare.com`.

**2. Desplegar**, desde esta carpeta:

```
npx wrangler login      # abre el navegador para dar permiso
npx wrangler deploy
```

Al terminar da una dirección tipo `https://mindscrolling-panel.TU-CUENTA.workers.dev`.
Guárdala: es lo único que hay que meter en la aplicación.

**3. Los cuatro secretos.** Cada comando pregunta el valor y no lo enseña por
pantalla. **Ninguno se escribe en un fichero ni llega a GitHub.**

```
npx wrangler secret put USUARIO        # el nombre con el que entras
npx wrangler secret put CLAVE          # tu contraseña
npx wrangler secret put FIRMA          # un texto largo inventado, para firmar las sesiones
npx wrangler secret put GITHUB_TOKEN   # el token de GitHub
```

El token de GitHub se saca en Settings → Developer settings → Fine-grained
tokens, limitado a `Aluonam/mindscrolling`, con permiso de **Contents** y
**Workflows** en lectura y escritura. Ese sí conviene apuntarlo en un gestor de
contraseñas: si algún día hay que rehacer el servicio, se vuelve a pegar.

**4. En la aplicación.** Abre el panel de fuentes y pega la dirección del paso 2
la primera vez. Se queda guardada.

## Cambiar la contraseña

`npx wrangler secret put CLAVE` otra vez. Tiene efecto en el siguiente intento,
en todos los dispositivos.

## Si alguna vez sospechas

Revoca el token en GitHub y saca otro; luego `npx wrangler secret put GITHUB_TOKEN`
con el nuevo. Las sesiones abiertas se caen solas cambiando `FIRMA`.

## Lo que este servicio NO hace

No guarda nada. No tiene base de datos ni recuerda quién ha entrado: cada
petición trae su sesión firmada y se comprueba en el momento. Si mañana lo
borras, lo único que se pierde es poder editar desde el móvil — la edición de
cada día sigue saliendo igual, porque la genera GitHub Actions por su cuenta.
