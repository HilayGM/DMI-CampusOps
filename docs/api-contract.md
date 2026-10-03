# Contrato del cliente cloud de CampusOps

Este documento fija el límite entre los datos remotos del backend didáctico, los objetos usados por la aplicación y los errores que se muestran o registran. Todos los ejemplos usan identidades y contenido ficticios.

## Transporte común

- URL local predeterminada: `http://127.0.0.1:4310` (`10.0.2.2` desde el emulador Android).
- Las rutas de incidencias reciben `Authorization: Bearer <token>` y `X-Course-Actor: <actorId>` desde la capa de cliente. Las pantallas no construyen solicitudes HTTP.
- `course-valid-token` y actores como `reporter-1` son fixtures públicos del simulador, no credenciales de producción.
- Las escrituras reciben una `Idempotency-Key` estable de ocho o más caracteres.
- Las respuestas se leen inicialmente como `unknown`; sólo se usan después de validarlas.

## Sobre remoto validado

Lista y detalle usan el DTO remoto siguiente:

```ts
type RemoteResourceDto = {
  id: string;                       // no vacío
  version: number;                  // entero >= 0
  status: string;                   // no vacío
  payload: Record<string, unknown> | null;
};
```

`parseRemoteResource` delega en el parser compartido de CampusOps. Rechaza raíces nulas, listas, campos obligatorios ausentes, versiones no enteras y payloads que no sean objeto o `null`. Ignora campos futuros del sobre, no modifica el objeto recibido y retorna una unión discriminada:

```ts
{ ok: true, value: RemoteResourceDto }
| { ok: false, error: 'contract' }
```

Un `payload: null` es un sobre remoto **válido sin datos de dominio**. No equivale a un contrato malformado y no autoriza completar categoría, descripción o ubicación con valores inventados.

## Consultar lista

`GET /v1/incidents`

Respuesta HTTP 200:

```json
{ "items": [{ "id": "campus-inc-001", "version": 1, "status": "assigned", "payload": { "category": "connectivity", "description": "Falla ficticia de red", "location": "Edificio de prueba A" } }] }
```

El cliente valida que la raíz sea un objeto, que `items` sea una lista y que cada elemento cumpla el sobre remoto. `items: []` es éxito sin incidencias. Los elementos con `payload: null` no se convierten en incidencias y se omiten del resultado de dominio; una lista que sólo contiene payloads nulos devuelve `[]`. Se conserva la firma `Promise<readonly Incident[]>`: no distingue cuántos elementos remotos carecían de datos. Un elemento malformado rechaza la operación completa, incluso si hay otros elementos nulos o válidos.

## Consultar detalle

`GET /v1/incidents/:id`

La respuesta HTTP 200 es un `RemoteResourceDto` directo. El identificador se codifica como segmento de URL. Un sobre válido con `payload: null` devuelve `null` en el puerto de aplicación. Se conserva el comportamiento existente de `getById`: HTTP 404 también devuelve `null`. Los demás rechazos HTTP son errores `http` con `status`; no se fabrica una incidencia.

## Crear incidencia

`POST /v1/incidents`

Solicitud para un actor con rol `reporter`:

```json
{
  "category": "connectivity",
  "description": "Falla ficticia de red",
  "location": "Edificio de prueba A"
}
```

`category` debe pertenecer al vocabulario publicado; `description` y `location` son textos no vacíos. La respuesta 201 contiene:

```json
{
  "incident": { "id": "campus-inc-101", "version": 1, "status": "open", "payload": { "category": "connectivity", "description": "Falla ficticia de red", "location": "Edificio de prueba A" } },
  "operationId": "create-demo-001",
  "duplicate": false
}
```

El cliente valida la raíz, `incident` mediante el mismo parser, `operationId` no vacío y `duplicate` booleano. Una repetición con la misma clave y el mismo cuerpo puede responder 200 y `duplicate: true` sin crear otra incidencia.

La firma existente exige `Promise<Incident>`. Si el sobre de `incident` es válido pero su payload es nulo, la creación rechaza con `kind: 'absent'`, distinto de `contract`. Esto significa que no hay datos de dominio para devolver, no que el servidor no haya guardado la operación. Un reintento debe conservar la misma clave y cuerpo. No se amplía la firma ni se inventan datos.

## DTO remoto frente al dominio de la aplicación

El DTO conserva `version`, `status` textual y un payload todavía desconocido. El modelo `Incident` que consume la UI contiene únicamente campos de dominio ya validados: `id`, `title`, `description`, `status`, `category` y `location`. El mapeador del cliente debe validar por separado el vocabulario de estado/categoría y los textos requeridos. Esta separación evita que un cambio o dato corrupto del servidor llegue directamente a una pantalla.

| Resultado en el límite | Interpretación del cliente |
|---|---|
| Sobre válido y payload de dominio válido | Puede mapearse a `Incident`. |
| Sobre válido y `payload: null` | Ausencia permitida; no es error de contrato ni `Incident`. |
| Sobre o payload de dominio malformado | `kind: 'contract', reason: 'schema'`. |
| Lectura JSON rechazada, incluida sintaxis inválida | `kind: 'contract', reason: 'json'`. |
| Timeout interno agotado durante fetch o lectura del cuerpo | Error `timeout`. |
| HTTP no exitoso, incluido 500 | Error `http` con `status`; excepción compatible: detalle 404 devuelve `null`. |
| Fallo de transporte | Error `network`. |

`ClientFailure`, en `application/clientErrors.ts`, es una unión discriminada de objetos congelados, no instancias de `Error`. Conserva `kind`, `code` y `message` seguro mediante `toSafeError`; sólo `http` agrega `status` y `contract` agrega `reason`. No conserva stack, cause, excepciones originales ni cuerpos. La variante adicional `precondition` representa sesión/actor no disponibles o clave de idempotencia inválida.

El timeout predeterminado es 8.000 ms, configurable con `timeoutMs`. Usa el AbortController existente y limpia su temporizador en `finally`. Un rechazo de fetch sólo es `timeout` cuando la señal interna está abortada; incluso un `AbortError` ajeno a ese timeout es `network`. El transporte inyectado debe respetar AbortSignal.

La telemetría usa `recordSafeTelemetry` con nombre de operación fijo y el fallo ya seguro; jamás recibe el error original, cabeceras, URL con identificadores o cuerpos. El sanitizador acumulado vuelve a redactar los campos sensibles, incluido `message`. Las pantallas conservan sus mensajes genéricos. No se registran tokens, email, ubicación, coordenadas, comentarios ni texto remoto arbitrario.

## Pruebas reproducibles

`HttpIncidentRepository.test.ts` usa fetch inyectado, respuestas simuladas y temporizadores falsos con 5 ms para cubrir lista, detalle y creación. Comprueba DTO/dominio, no mutación, lista vacía, null, contrato inválido, JSON inválido, timeout, HTTP 500, red, sanitización y ausencia de fetch directo en UI. `remoteResourceParser.test.ts` prueba el parser compartido. No requieren Internet público. El backend didáctico mantiene sus escenarios publicados y autopruebas; estas pruebas unitarias no afirman ejecutar esos escenarios a través del cliente real.
