# Evidencia - Hallazgo 1

## Que se verifico

Se verifico que el backend no devuelva una respuesta idempotente almacenada cuando el actor ya no conserva autorizacion sobre la incidencia. Tambien se cubren los comportamientos existentes de idempotencia valida y reutilizacion de clave con contenido diferente.

## Prueba utilizada

Archivo: `course-backend/campusops-self-test.mjs`.

Escenario agregado:

1. `technician-1` ejecuta una accion `comment` con una `Idempotency-Key` sintetica.
2. Repite la misma accion y recibe una respuesta idempotente valida.
3. Reutiliza la misma clave con otro contenido y recibe `409`.
4. `coordinator-1` reasigna la incidencia a `technician-2`.
5. `technician-1` repite exactamente la accion original con la misma clave.
6. El backend debe responder `403` y no debe incluir `incident` en la respuesta.

Comando intentado:

```bash
npm run backend:self-test
```

## Resultado esperado

- Replay autorizado: `200` con `duplicate: true`.
- Fingerprint diferente: `409`.
- Replay despues de perder acceso: `403` con `{ "code": "forbidden" }` y sin payload de incidencia.

## Resultado obtenido

La prueba no pudo ejecutarse en este entorno porque `node`/`npm` responden:

```text
Node.js v22.22.0 is not installed or cannot be found.
```

## Conclusion

La correccion y la prueba automatizada quedaron implementadas. La evidencia de ejecucion debe completarse en un entorno donde Node 22.22.0 este disponible.
