# Política de sincronización — Semana 08

## Alcance

La sincronización conserva operaciones creadas sin conexión y evita perder trabajo cuando el registro remoto cambió antes de la reconexión. `resolveSync` combina cambios independientes y declara conflictos cuando ambas versiones modifican el mismo campo con valores JSON distintos.

El caso central es un inicio local frente a una reasignación remota. El campo compuesto `work` se informa como conflicto; no se aplica automáticamente ninguna de las dos intenciones.

## Identidad e idempotencia

Cada operación tiene un `operationId` estable. `deduplicateOperations` conserva la primera aparición de cada identificador, en el orden original y sin mutar la entrada. Los reintentos deben reutilizar ese identificador como `Idempotency-Key` y conservar `baseVersion`.

La cola retira una operación únicamente después de una confirmación válida del servidor. Una respuesta duplicada es confirmación solamente cuando el servidor acredita que la misma clave y el mismo contenido ya fueron aceptados.

## Conflictos y fallos

Los cambios independientes se combinan. Si local y remoto cambian el mismo campo a contenidos JSON distintos, se devuelve una lista determinista de campos conflictivos ordenada por nombre. La operación pendiente no se descarta: se conserva para resolución explícita y se informa al usuario.

Un `409` de versión, timeout, error de red, respuesta inválida o resultado incierto conserva la operación en la cola. Un timeout no se interpreta como rechazo definitivo ni como confirmación.

## Límite de integración actual

La cola y el repositorio HTTP existen por separado. La composición actual conecta `HttpIncidentRepository` directamente y no expone todavía un puerto para enviar el payload arbitrario de una `StoredPendingOperation`, recuperar `base`/`local`/`remote` ni clasificar el resultado completo de idempotencia. Por tanto, este cambio implementa los adaptadores puros y documenta la política, pero no simula un coordinador de sincronización incompleto.

La integración futura debe añadir ese puerto, reutilizar `operationId`/`baseVersion`, confirmar solo respuestas aceptadas y mantener pendientes los conflictos y resultados inciertos.

## Verificación

Comandos previstos, cuyos resultados deben registrarse únicamente después de ejecutarlos:

```text
npm.cmd test -- --ci --runInBand course-tests/public/week-08.test.ts src/course-evaluation/_tests_/sync.test.ts
make verify-week-08
make public-test-week-08
```
