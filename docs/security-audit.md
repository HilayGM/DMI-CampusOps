# Auditoría de seguridad — Semana 4

## Alcance

Se revisaron el cliente Expo, el backend didáctico, las pruebas, los archivos de configuración y el estado de Git. Todos los valores usados para validar las correcciones son fixtures ficticios; no se usaron credenciales ni datos personales reales.

## Hallazgos

| # | Hallazgo | Riesgo | Solución aplicada | Evidencia |
|---|---|---|---|---|
| 1 | Tokens de acceso y renovación escritos directamente en `course-backend/server.mjs` y `course-backend/campusops.mjs` | Cualquier persona con acceso al repositorio podía conocer y reutilizar los tokens compartidos si el fixture se ejecutaba fuera del entorno didáctico | Se sustituyeron los literales por variables de entorno obligatorias y se documentaron sus nombres vacíos en `.env.example` | [tokens configurados por entorno](evidence/tokens-configurados.txt) |
| 2 | El login devolvía el código específico `unknown_fixture_actor` | La diferencia de respuesta revelaba si un identificador de actor existía y facilitaba enumerar cuentas | Los intentos inválidos ahora responden únicamente `{ "code": "unauthorized" }` y una prueba verifica el contrato | [error de autenticación genérico](evidence/error-autenticacion-generico.txt) |
| 3 | `.DS_Store` no estaba ignorado y dos copias ya estaban versionadas | Estos archivos del sistema pueden publicar metadatos locales y generar cambios ajenos al proyecto | Se agregó `.DS_Store` a `.gitignore` y se retiraron las dos copias del índice de Git | [archivos sensibles ignorados](evidence/archivos-sensibles-ignorados.txt) |
| 4 | `redactForTelemetry` era un stub sin sanitización | Una integración de telemetría podía fallar o terminar registrando objetos con tokens, correo, nombre, ubicación y otros datos sensibles | Se implementó una copia recursiva que reemplaza los campos sensibles por `[REDACTED]` sin mutar el objeto original | [prueba de sanitización](evidence/telemetria-sanitizada.txt) |

## Hallazgo 1 — Tokens escritos directamente en el backend

### Problema encontrado

El backend comparaba y devolvía tokens escritos como literales en `course-backend/server.mjs` y `course-backend/campusops.mjs`. Aunque los valores encontrados eran fixtures sintéticos, el patrón deja la credencial compartida dentro del repositorio y puede trasladarse por error a un despliegue real.

### Riesgo

Una persona con lectura del repositorio puede copiar el token y autenticarse contra cualquier instancia que conserve el mismo valor. Además, rotarlo exige modificar el código y generar una nueva versión.

### Solución

El servidor ahora exige `COURSE_BACKEND_ACCESS_TOKEN`, `COURSE_BACKEND_REFRESH_TOKEN` y `COURSE_BACKEND_NEXT_REFRESH_TOKEN`. Si falta cualquiera, finaliza antes de escuchar conexiones. `.env.example` contiene sólo los nombres, sin valores, y `.env` continúa ignorado.

### Antes

```js
if (request.headers.authorization !== 'Bearer course-valid-token') {
  return send(response, 401, { code: 'unauthorized' });
}
```

### Después

```js
const accessToken = process.env.COURSE_BACKEND_ACCESS_TOKEN;
const refreshToken = process.env.COURSE_BACKEND_REFRESH_TOKEN;
const nextRefreshToken = process.env.COURSE_BACKEND_NEXT_REFRESH_TOKEN;

if (!accessToken || !refreshToken || !nextRefreshToken) {
  throw new Error('Missing required backend authentication environment variables');
}
```

### Evidencia

La prueba integral arranca el backend con valores ficticios inyectados, autentica solicitudes y comprueba que la sesión devuelve esos valores. La prueba termina correctamente. También se verificó por separado que el servidor rechaza el arranque cuando faltan las variables: [tokens-configurados.txt](evidence/tokens-configurados.txt).

## Hallazgo 2 — El mensaje de error permitía enumerar actores

### Problema encontrado

`POST /v1/session/login` respondía `unknown_fixture_actor` cuando el identificador no existía. Esa respuesta comunicaba más información de la necesaria sobre el motivo del rechazo.

### Riesgo

Comparando respuestas, un atacante podría probar identificadores y conocer cuáles pertenecen al sistema. En una implementación con usuarios reales, esa enumeración ayuda a preparar ataques dirigidos.

### Solución

Todas las credenciales inválidas reciben el mismo estado `401` y el código genérico `unauthorized`. La prueba del backend realiza un intento con un actor ficticio inexistente y compara el cuerpo completo.

### Antes

```js
return send(response, 401, { code: 'unknown_fixture_actor' });
```

### Después

```js
return send(response, 401, { code: 'unauthorized' });
```

### Evidencia

La aserción automatizada y su ejecución exitosa están registradas en [error-autenticacion-generico.txt](evidence/error-autenticacion-generico.txt).

## Hallazgo 3 — Archivos `.DS_Store` dentro del repositorio

### Problema encontrado

La raíz del proyecto y `reports/` contenían archivos `.DS_Store` versionados, pero `.gitignore` no tenía una regla para impedir nuevas incorporaciones.

### Riesgo

Los archivos de metadatos del sistema operativo no son parte de la aplicación, pueden revelar nombres o preferencias de carpetas locales y ensucian el historial con cambios accidentales.

### Solución

Se agregó la regla `.DS_Store` a `.gitignore` y se retiraron ambas copias del índice mediante `git rm`. La regla aplica tanto a la raíz como a subdirectorios.

### Antes

```gitignore
node_modules/
.expo/
```

### Después

```gitignore
node_modules/
.DS_Store
__pycache__/
.expo/
```

### Evidencia

`git check-ignore` identifica la regla para ambas rutas y `git ls-files '*.DS_Store'` ya no devuelve archivos: [archivos-sensibles-ignorados.txt](evidence/archivos-sensibles-ignorados.txt).

## Hallazgo 4 — Sanitización de telemetría sin implementar

### Problema encontrado

`src/course-evaluation/index.ts` exportaba `redactForTelemetry`, pero la función sólo lanzaba el error de función pendiente. El proyecto no tenía una implementación capaz de retirar información sensible de un objeto antes de enviarlo a logs o telemetría.

### Riesgo

Registrar el objeto completo puede exponer encabezados de autorización, tokens, correo, nombre, identificadores personales, ubicación, fotos y comentarios internos.

### Solución

Se implementó un recorrido recursivo de objetos y listas. Las claves sensibles se normalizan sin distinguir mayúsculas, guiones o guiones bajos, y su valor completo se sustituye por `[REDACTED]`. La entrada no se modifica y el contexto técnico permitido se conserva.

### Antes

```ts
export function redactForTelemetry(_input: unknown): unknown {
  return pending('redactForTelemetry');
}
```

### Después

```ts
export function redactForTelemetry(input: unknown): unknown {
  return redactTelemetryValue(input, new WeakMap());
}
```

### Evidencia

La prueba pública introduce autorización, correo, nombre, ubicación, fotos y comentarios ficticios; verifica que todos queden redactados y que el identificador técnico de incidencia se conserve: [telemetria-sanitizada.txt](evidence/telemetria-sanitizada.txt).

## Comprobación final

- `npm run typecheck`
- `npm run lint`
- `npm run test -- --ci --runInBand course-tests/public/week-04.test.ts`
- `npm run backend:self-test`
- `git check-ignore -v .env .DS_Store reports/.DS_Store`
- `git ls-files '*.DS_Store' '.env'`
- `git status --short --branch`

La comprobación final debe mostrar que `.env` y `.DS_Store` están ignorados, que el commit elimina las copias de `.DS_Store` previamente versionadas y que las únicas cadenas de autenticación de las pruebas son datos ficticios declarados explícitamente como tales.
