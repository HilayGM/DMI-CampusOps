# Auditoria de seguridad - Semana 4

## Objetivo

Se realizo una revision del proyecto CampusOps para detectar riesgos reales de seguridad y privacidad, aplicar correcciones comprobables y documentar la secuencia problema, riesgo, correccion y evidencia. La auditoria se enfoco en hallazgos observables en el estado actual del repositorio.

## Alcance

- Backend de CampusOps.
- Autorizacion e idempotencia.
- Sanitizacion de telemetria.
- Datos personales en archivos de evidencia.
- Configuracion relevante, incluida la proteccion de archivos de entorno.

No se utilizaron credenciales reales, tokens reales, contrasenas, API keys ni datos personales nuevos. Los valores usados en pruebas y ejemplos son sinteticos o anonimizados.

## Hallazgos

| # | Hallazgo | Riesgo | Solucion aplicada | Evidencia |
|---|---|---|---|---|
| 1 | Respuesta idempotente sin revalidar autorizacion | Un actor que perdio acceso podia repetir una operacion y recibir una respuesta almacenada | Revalidacion de autorizacion antes de devolver una operacion idempotente almacenada | Prueba agregada en `course-backend/campusops-self-test.mjs`; ejecucion local bloqueada por falta de Node 22.22.0 |
| 2 | Sanitizacion de telemetria no implementada | Campos sensibles podian quedar sin redaccion antes de registrarse o conservarse | Implementacion de sanitizacion de telemetria | Pruebas publicas de Semana 4 y Semana 10 identificadas; ejecucion local bloqueada por falta de Node 22.22.0 |
| 3 | Exposicion innecesaria de datos personales en evidencias | Nombres completos e identificadores academicos aumentan la exposicion en un repositorio publico | No modificar automaticamente los datos historicos; documentar el riesgo y aplicar minimizacion en evidencias futuras | Revision estatica detecto campos de identidad sin reproducir valores reales |

## Hallazgo 1 - Respuesta idempotente sin revalidar autorizacion

### Problema encontrado

El problema estaba en `course-backend/campusops.mjs`. El backend consultaba una operacion anterior mediante `Idempotency-Key` y podia devolver `previous.result` antes de volver a comprobar si el actor todavia tenia autorizacion sobre la incidencia y la accion.

### Riesgo

Si un tecnico ejecutaba una accion cuando tenia acceso a una incidencia y despues la incidencia era reasignada, podia repetir la misma operacion con la misma clave idempotente. Sin revalidacion, el backend podia devolver la respuesta guardada de la operacion anterior, incluyendo contenido de la incidencia que el actor ya no debia recibir.

### Solucion

Se agrego una funcion auxiliar `canPerformAction` que reutiliza la regla existente `visible()` para comprobar rol, asignacion y accion permitida. Antes de devolver un resultado idempotente almacenado para acciones sobre incidencias, el backend vuelve a validar que el actor actual conserve autorizacion.

### Antes

```js
const previous = operations.get(operationKey);
if (previous) {
  if (previous.fingerprint !== fingerprint) return send(response, 409, { code: 'idempotency_key_reused' });
  return send(response, 200, { ...previous.result, duplicate: true });
}
```

### Despues

```js
const previous = operations.get(operationKey);
if (previous) {
  if (previous.fingerprint !== fingerprint) return send(response, 409, { code: 'idempotency_key_reused' });
  if (match[1] && !canPerformAction(actorId, role, incident, input.action)) {
    return send(response, 403, { code: 'forbidden' });
  }
  return send(response, 200, { ...previous.result, duplicate: true });
}
```

### Evidencia

Se amplio `course-backend/campusops-self-test.mjs` para cubrir tres casos:

- repetir una operacion mientras el usuario conserva permisos mantiene el comportamiento idempotente;
- reutilizar la misma clave con contenido diferente mantiene la respuesta `409`;
- repetir la operacion despues de que el tecnico pierde acceso devuelve `403` y no incluye el payload almacenado.

Comando intentado:

```bash
npm run backend:self-test
```

Resultado obtenido en este entorno: no se ejecuto la prueba porque el shell respondio `Node.js v22.22.0 is not installed or cannot be found.`. La prueba queda implementada y lista para ejecutarse en un entorno con Node 22.22.0 disponible.

---

## Hallazgo 2 - Sanitizacion de telemetria no implementada

### Problema encontrado

El problema estaba en `src/course-evaluation/index.ts`. La funcion `redactForTelemetry` estaba declarada, pero delegaba a `pending`, por lo que no realizaba ninguna redaccion.

### Riesgo

Sin sanitizacion, informacion sensible o de privacidad podria conservarse en logs, reportes o telemetria. La documentacion del proyecto identifica como sensibles, entre otros, encabezados de autorizacion, tokens, correo, nombres, ubicacion, coordenadas, fotografias, evidencia, comentarios internos e historial de asignaciones.

### Solucion

Se implemento una sanitizacion recursiva que:

- procesa objetos y arreglos;
- no muta la entrada original;
- conserva valores tecnicos no sensibles;
- normaliza claves a minusculas y elimina `_` y `-`;
- sustituye los valores sensibles por `[REDACTED]`;
- conserva `null`, `undefined`, strings, numeros y booleanos cuando no estan bajo una clave sensible.

### Antes

```ts
export function redactForTelemetry(_input: unknown): unknown {
  return pending('redactForTelemetry');
}
```

### Despues

```ts
export function redactForTelemetry(input: unknown): unknown {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => redactForTelemetry(item));
  }

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      SENSITIVE_TELEMETRY_KEYS.has(normalizeTelemetryKey(key)) ? REDACTED : redactForTelemetry(value),
    ]),
  );
}
```

### Evidencia

Se revisaron `docs/CAMPUSOPS_API.md`, `course-tests/public/week-04.test.ts` y `course-tests/public/week-10.test.ts`. La implementacion sigue el contrato documentado para Semana 4.

Comandos intentados:

```bash
npm test -- --ci --runInBand course-tests/public/week-04.test.ts
npm test -- --ci --runInBand course-tests/public/week-10.test.ts
```

Resultado obtenido en este entorno: no se ejecutaron las pruebas porque el shell respondio `Node.js v22.22.0 is not installed or cannot be found.`. Las pruebas quedan identificadas para ejecucion posterior en un entorno con Node 22.22.0 disponible.

---

## Hallazgo 3 - Exposicion innecesaria de datos personales en evidencias

### Problema encontrado

Algunos archivos historicos de `evidence/week-01/`, `evidence/week-02/` y `evidence/week-03/` combinan identificadores academicos y nombres de integrantes. No se reproducen valores reales en esta auditoria.

Ejemplo anonimizado:

```json
{
  "studentId": "[ID_ESTUDIANTE]",
  "name": "[NOMBRE_ESTUDIANTE]"
}
```

### Riesgo

En un repositorio publico, combinar nombres completos con identificadores academicos incrementa la exposicion de datos personales. Aunque ciertos campos pueden formar parte de contratos de evaluacion, el principio de minimizacion indica que deben conservarse solo los datos estrictamente necesarios.

### Solucion propuesta

Este hallazgo se documento, pero no se modificaron los archivos historicos para evitar romper evaluaciones anteriores. Antes de eliminar, sustituir o pseudonimizar valores existentes, debe verificarse que campos son obligatorios segun los contratos de evidencia. Para evidencias futuras, se recomienda incluir solo los campos requeridos y evitar datos personales no solicitados.

### Evidencia

La revision estatica detecto campos de identidad en archivos de evidencia, sin copiar valores reales en este documento. No se modificaron `evidence/week-*`.

## Mejora preventiva adicional

Se reviso `.gitignore` y ya existia proteccion para `.env`. Como mejora preventiva, se agregaron patrones para variantes comunes de entorno y archivos sensibles: `.env.*`, `!.env.example`, `.npmrc`, `.DS_Store`, `*.pem` y `*.key`. Esta mejora no sustituye ninguno de los tres hallazgos principales.
