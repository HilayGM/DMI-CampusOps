# Evidencia - Hallazgo 2

## Que se verifico

Se verifico que `redactForTelemetry` tenga una implementacion recursiva alineada con `docs/CAMPUSOPS_API.md`: objetos, arreglos y claves sensibles se procesan sin mutar la entrada original, sustituyendo los valores sensibles por `[REDACTED]`.

## Prueba utilizada

Pruebas relevantes identificadas:

```bash
npm test -- --ci --runInBand course-tests/public/week-04.test.ts
npm test -- --ci --runInBand course-tests/public/week-10.test.ts
```

`week-04.test.ts` valida la redaccion de encabezados de autorizacion, correo, nombre visible, ubicacion, fotos y comentarios internos.

`week-10.test.ts` incluye una verificacion de redaccion de `accessToken` en contexto de error observable.

## Resultado esperado

- Los campos sensibles se reemplazan por `[REDACTED]`.
- Campos tecnicos como `incidentId`, `error` y `attempt` se conservan.
- La funcion no modifica el objeto original.

## Resultado obtenido

Las pruebas no pudieron ejecutarse en este entorno porque `node`/`npm` responden:

```text
Node.js v22.22.0 is not installed or cannot be found.
```

## Conclusion

La correccion quedo implementada y las pruebas relevantes quedaron identificadas. La evidencia de ejecucion debe completarse en un entorno donde Node 22.22.0 este disponible.
