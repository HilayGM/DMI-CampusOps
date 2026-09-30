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
{ "items": [{ "id": "campus-inc-001", "version": 1, "status": "assigned", "payload": {} }] }
```

El cliente debe validar que la raíz sea un objeto, que `items` sea una lista y que cada elemento cumpla el sobre remoto. Una lista vacía es éxito sin incidencias. Un elemento con `payload: null` conserva el estado “payload ausente”; no se transforma en una incidencia de aplicación.

## Consultar detalle

`GET /v1/incidents/:id`

La respuesta HTTP 200 es un `RemoteResourceDto` directo. El identificador se codifica como segmento de URL. `404` es un error HTTP distinguible; no se representa como un DTO nulo ni como una incidencia inventada.

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
  "incident": { "id": "campus-inc-101", "version": 1, "status": "open", "payload": {} },
  "operationId": "create-demo-001",
  "duplicate": false
}
```

El cliente valida la raíz, `incident` mediante el mismo parser, `operationId` no vacío y `duplicate` booleano. Una repetición con la misma clave y el mismo cuerpo puede responder 200 y `duplicate: true` sin crear otra incidencia.

## DTO remoto frente al dominio de la aplicación

El DTO conserva `version`, `status` textual y un payload todavía desconocido. El modelo `Incident` que consume la UI contiene únicamente campos de dominio ya validados: `id`, `title`, `description`, `status`, `category` y `location`. El mapeador del cliente debe validar por separado el vocabulario de estado/categoría y los textos requeridos. Esta separación evita que un cambio o dato corrupto del servidor llegue directamente a una pantalla.

| Resultado en el límite | Interpretación del cliente |
|---|---|
| Sobre válido y payload de dominio válido | Puede mapearse a `Incident`. |
| Sobre válido y `payload: null` | Ausencia permitida; no es error de contrato ni `Incident`. |
| Sobre o payload de dominio malformado | Error `contract`. |
| Tiempo de espera agotado/abortado | Error `timeout`. |
| HTTP no exitoso, incluido 500 | Error `http` con código/estado técnico seguro. |
| Fallo de transporte | Error `network`. |

Los errores se modelan como datos distinguibles en la capa cliente y se convierten a mensajes seguros antes de llegar a la UI. La telemetría usa `recordSafeTelemetry`; nunca conserva tokens, ubicación, descripción libre, comentarios, fotografías ni cuerpos completos de respuesta.

## Pruebas reproducibles

Las pruebas unitarias usan respuestas simuladas y el backend local con `X-Course-Scenario`: `success`, `nullable`, `malformed`, `slow` y `server_error`. No dependen de Internet público. Deben cubrir lista, detalle y creación, además de comprobar explícitamente que los datos remotos no se mutan y que los diagnósticos permanecen sanitizados.
