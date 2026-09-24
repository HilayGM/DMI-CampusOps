# Auditoría de seguridad — Semana 4

## Hallazgos

| # | Hallazgo | Riesgo | Solución aplicada | Evidencia |
| --- | --- | --- | --- | --- |
| 1 | `redactForTelemetry` estaba pendiente y lanzaba una excepción. | Los datos sensibles podían llegar a telemetría sin una función de redacción reutilizable. | Se implementó redacción recursiva por claves sensibles, sin mutar la entrada. | `docs/evidence/hallazgo-1-redaccion.txt` y `course-tests/public/week-04.test.ts`. |
| 2 | `course-backend/server.mjs` enviaba `access-control-allow-origin: *`. | Cualquier origen web podía intentar leer respuestas del backend desde un navegador. | Se sustituyó el comodín por `COURSE_BACKEND_ALLOWED_ORIGIN`, cuyo valor predeterminado es `http://localhost:8081`, y se añadió `Vary: Origin`. | `docs/evidence/hallazgo-2-cors-autorizacion.txt` y `npm run backend:self-test`. |
| 3 | `POST /v1/resources/action` permitía mutar recursos sin comprobar `Authorization`. | Un cliente sin autenticación podía crear operaciones y modificar el estado didáctico del recurso. | La ruta devuelve `401` sin el bearer fixture y mantiene el flujo autenticado/idempotente. | `docs/evidence/hallazgo-2-cors-autorizacion.txt` y `npm run backend:self-test`. |

## Hallazgo 1 — Sanitización de telemetría pendiente

### Problema encontrado

`src/course-evaluation/index.ts` exportaba `redactForTelemetry`, pero la función llamaba a `pending()` y lanzaba una excepción. El test público de Semana 4 ya definía datos sintéticos de autorización, perfil, ubicación, fotos y comentarios internos que debían ser redactados.

### Riesgo

Un consumidor que intentara preparar un diagnóstico podía fallar antes de aplicar un control centralizado de privacidad. Si ese consumidor registraba la entrada directamente, podría conservar tokens, identificadores, ubicación, evidencia o comentarios internos.

### Solución

Se implementó una función recursiva para objetos y listas. Las claves sensibles se normalizan ignorando mayúsculas, guiones y guiones bajos, y su valor completo se sustituye por `[REDACTED]`. Los campos técnicos no sensibles se conservan y la entrada original no se modifica.

### Antes

```ts
export function redactForTelemetry(_input: unknown): unknown {
	return pending('redactForTelemetry');
}
```

### Después

```ts
export function redactForTelemetry(input: unknown): unknown {
	if (input === null || typeof input !== 'object') return input;
	if (Array.isArray(input)) return input.map((item) => redactForTelemetry(item));
	return Object.fromEntries(Object.entries(input).map(([key, value]) => {
		const normalizedKey = key.toLowerCase().replaceAll('_', '').replaceAll('-', '');
		return [key, sensitiveTelemetryKeys.has(normalizedKey) ? '[REDACTED]' : redactForTelemetry(value)];
	}));
}
```

### Evidencia

`docs/evidence/hallazgo-1-redaccion.txt` registra el resultado real de `npm.cmd test -- --ci --runInBand course-tests/public/week-04.test.ts`: una suite y un test pasaron.

## Hallazgo 2 — CORS abierto a cualquier origen

### Problema encontrado

`course-backend/server.mjs` establecía `access-control-allow-origin` en `*` para todas las respuestas.

### Riesgo

El comodín habilita solicitudes cross-origin desde cualquier sitio web. Aunque este backend usa fixtures académicos y debe permanecer local, una configuración abierta amplía innecesariamente quién puede interactuar con el servicio desde un navegador.

### Solución

Se configuró un origen permitido mediante `COURSE_BACKEND_ALLOWED_ORIGIN`, con `http://localhost:8081` como valor predeterminado, y se añadió `Vary: Origin`. No se añadió ningún secreto a la configuración.

### Antes

```js
'access-control-allow-origin': '*',
```

### Después

```js
'access-control-allow-origin': process.env.COURSE_BACKEND_ALLOWED_ORIGIN ?? 'http://localhost:8081',
vary: 'Origin',
```

### Evidencia

`course-backend/self-test.mjs` comprueba que una petición con un origen no confiable no recibe `*`. `docs/evidence/hallazgo-2-cors-autorizacion.txt` conserva el resultado real de `npm.cmd run backend:self-test`, que terminó con `Controlled backend self-test passed.`

## Hallazgo 3 — Mutación heredada sin autenticación

### Problema encontrado

`POST /v1/resources/action` validaba la clave de idempotencia y el cuerpo, pero no validaba el encabezado `Authorization`. Por contraste, `GET /v1/resources` sí rechazaba solicitudes sin autenticación.

### Riesgo

Un cliente sin sesión podía crear una operación sobre `resource-1` y obtener una respuesta de mutación. La idempotencia evita duplicados, pero no sustituye el control de acceso.

### Solución

La ruta devuelve `401` antes de procesar la clave o el cuerpo cuando falta el bearer fixture. El self-test conserva además una ejecución autenticada y comprueba su replay idempotente.

### Antes

```js
if (request.method === 'POST' && url.pathname === '/v1/resources/action') {
	const key = request.headers['idempotency-key'];
```

### Después

```js
if (request.method === 'POST' && url.pathname === '/v1/resources/action') {
	if (request.headers.authorization !== 'Bearer course-valid-token') {
		return send(response, 401, { code: 'unauthorized' });
	}
	const key = request.headers['idempotency-key'];
```

### Evidencia

`course-backend/self-test.mjs` ejecuta primero la mutación sin autorización y exige `401`; luego ejecuta la misma operación con el fixture sintético y exige `201` seguido de replay `200` con `duplicate: true`. El resultado completo está en `docs/evidence/hallazgo-2-cors-autorizacion.txt`.

## Alcance y revisión final

- Los tres hallazgos fueron observados en archivos reales y los tres fueron corregidos.
- `.gitignore` contiene `.env`; no existe un `.env` rastreado y `.env.example` solo contiene una URL local de desarrollo.
- No se incluyeron credenciales reales, tokens, API keys ni datos personales en esta auditoría o sus evidencias.
- `npm.cmd run typecheck` y `npm.cmd run lint` pasaron.
- `course-tests/public/week-04.test.ts` pasó.
- `course-tests/public/week-10.test.ts` no pasó porque `reduceRemoteResponses` sigue pendiente de su semana asignada; el smoke test también excedió su timeout de 5 segundos. Ninguno de esos fallos fue causado por los archivos corregidos en esta actividad.
