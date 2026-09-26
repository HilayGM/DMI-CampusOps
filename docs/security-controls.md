# Controles de seguridad y privacidad — Semana 04

## Almacenamiento de sesión implementado

CampusOps persiste únicamente la sesión mínima necesaria: `accessToken`, `refreshToken` y `expiresAt`. El puerto `SecureSessionStore` evita que los perfiles, nombres, ubicaciones, incidencias, fotografías, comentarios internos o datos de la interfaz se agreguen al registro persistente.

`ExpoSecureSessionStore` usa `expo-secure-store`, que delega la protección al almacenamiento seguro del sistema operativo. En iOS se utiliza `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, por lo que el registro no se migra a otro dispositivo mediante una restauración de respaldo. En Android, Expo SecureStore usa el mecanismo seguro proporcionado por la plataforma.

## Amenazas relacionadas

| Amenaza | Control aplicado | Comprobación |
|---|---|---|
| T5: un token aparece en logs o reportes | El adaptador no hace `console.log` ni devuelve el valor serializado al manejar una lectura fallida. | `ExpoSecureSessionStore.test.ts` simula una falla de plataforma y confirma que el resultado es `null`. |
| T6: una credencial queda en una ubicación insegura | Los tokens no se escriben en AsyncStorage ni en el código; se pasan al almacenamiento seguro por un puerto dedicado. | La prueba verifica la llamada a SecureStore y que sólo se serializan los tres campos mínimos. |
| T3/T4: datos de perfil o ubicación permanecen donde no son necesarios | `copySession` reconstruye el objeto permitido, por lo que propiedades adicionales no se persisten. | La prueba agrega un nombre ficticio y confirma que no queda en el valor almacenado. |

## Alternativas y decisión

Se eligió Expo SecureStore en lugar de AsyncStorage porque los tokens de sesión son secretos y necesitan la protección nativa de iOS/Android. También se consideró no persistir ninguna sesión: reduce superficie de exposición, pero obliga a autenticar en cada inicio y no cumple el caso de recuperación de sesión. Mantener un objeto completo de usuario dentro de SecureStore también fue descartado por minimización de datos: un almacén cifrado no justifica conservar información que la app no necesita recuperar.

## Riesgo residual

Un dispositivo desbloqueado, comprometido o con una sesión activa todavía puede permitir el uso de la aplicación. SecureStore tampoco evita que otro código registre un token antes de enviarlo al adaptador; esa protección corresponde al sanitizador de telemetría y a las pruebas negativas del equipo. El backend didáctico continúa usando fixtures y no representa una autenticación de producción.

## Errores seguros y pruebas negativas

Aportación de Oscar Martinez Martinez, Semana 04. Ocultar información en la interfaz no es suficiente: las pruebas negativas introducen datos ficticios sensibles y comprueban que tampoco se propaguen a errores, diagnósticos controlados ni representaciones serializadas de reportes. El almacenamiento se comprueba exclusivamente mediante el contrato del adaptador seguro y un cliente simulado.

`src/campusops/application/safeErrors.ts` define `toSafeError(unknown)`. Siempre construye un objeto nuevo con únicamente `code` y `message`, elegidos de un conjunto permitido. No copia mensajes arbitrarios, stack, cause, payload, request, response, usuario, sesión ni credenciales. Lee únicamente una propiedad propia de datos `code`; no invoca getters y captura fallos de objetos hostiles. No recorre ni modifica el objeto original. Esta conversión no sustituye la sanitización profunda de telemetría.

La integración real está en `src/api/courseBackend.ts`: los rechazos de fetch, JSON inválido y validación de salud salen como errores seguros. Los estados HTTP reconocidos se traducen sin leer el cuerpo de una respuesta fallida. Los fallos desconocidos usan `INTERNAL_ERROR`, sin inferir su naturaleza desde mensajes externos. Los éxitos conservan el contrato previo. La UI mantiene su estado offline y sus mensajes genéricos; `incidentQueries.ts` sigue propagando el mismo error del proveedor. No se modificaron el backend, SecureStore ni sus pruebas existentes. Los códigos de error controlados del backend ya evitan devolver excepciones completas; no se acredita cobertura de todas las excepciones del proceso servidor.

Suite nueva: `src/campusops/_tests_/securityNegativePaths.test.ts` (11 pruebas). Las aserciones sensibles comparan booleanos, claves o cantidades; no usan snapshots ni imprimen los valores ficticios en resultados esperados.

| Amenaza | Control | Prueba | Resultado | Riesgo residual |
|---|---|---|---|---|
| T3: comentarios internos en logs | Construcción del error permitido sin copiar notas ni errores originales antes del diagnóstico controlado. | Casos T3 de comentarios/notas, objetos completos y frontera HTTP con diagnóstico/reporte serializado. | Pendiente de verificación: Jest no pudo iniciarse. | Texto libre generado fuera de esta frontera, incluido el backend o terceros. |
| T4: ubicación en logs | Exclusión de payloads anidados, ubicaciones, coordenadas y fotografías del error seguro. | Casos T4 de ubicación, arrays e integración HTTP. | Pendiente de verificación: Jest no pudo iniciarse. | Librerías externas o diagnósticos que no usen la política. |
| T5: credenciales en stdout, stderr y reportes | Exclusión de token, authorization, usuario, sesión, credenciales, stack y cause; códigos/mensajes permitidos. | Casos T5 de campos sensibles, entradas desconocidas, códigos backend, HTTP y lectura fallida de SecureStore. | Pendiente de verificación: Jest no pudo iniciarse. | stdout/stderr de herramientas externas y captura del evaluador sin sanitizar. |

### Alcance de diagnósticos, reportes y almacenamiento

La prueba de integración simula fetch y consume el rechazo de la función HTTP real. Captura console.log/warn/error, emite un diagnóstico controlado con el error seguro y serializa en memoria un objeto de reporte que conserva su código. No se crea una plataforma de telemetría ni se verifica un archivo generado por el evaluador. Su stdout/stderr queda fuera de este control. La verificación del reporte final en disco sigue pendiente de su generación.

No existe una implementación de preferencias normales, AsyncStorage o localStorage para sesión en el código revisado. No se añadió una para simular cobertura. La prueba de SecureStore confirma, cuando pueda ejecutarse, que sólo se entregan accessToken, refreshToken y expiresAt al cliente protegido y que una lectura fallida no emite console.log/warn/error. Los tokens son necesarios en ese almacén seguro; la prueba excluye los datos adicionales. No acredita cifrado, borrado ni persistencia nativa en dispositivo. T3/T4/T5 mantienen las definiciones de logs de `docs/threat-model.md`; la minimización de almacenamiento es una comprobación complementaria, no una redefinición de esas amenazas.

### Estado real de verificación — 2026-09-26

Se intentaron, en este orden, los siguientes comandos:

1. `npm.cmd run typecheck`
2. `npm.cmd test -- --ci --runInBand src/campusops/_tests_/securityNegativePaths.test.ts`
3. `npm.cmd test -- --ci --runInBand src/campusops/_tests_`
4. `npm.cmd run lint`

Los cuatro terminaron con código 1 porque PowerShell no encontró npm.cmd. Se repitieron los mismos cuatro comandos con npm.exe, disponible en PATH: todos terminaron con código 1 por el bloqueo NVM4306, que identifica el script delegado de npm como no confiable. No se eludió esa protección ni se modificó NVM. Tampoco existe node_modules en este checkout. No llegaron a ejecutarse TypeScript, Jest ni ESLint; no se declara ninguna prueba aprobada ni un fallo funcional demostrado. No se instalaron paquetes.

### Evidencia pendiente

`reports/week-04/negative-tests.json` no se genera todavía: faltan ejecuciones reales y un SHA del trabajo implementado. Tras verificar, deberá contener schemaVersion 1, week 4, commitSha real, generatedAt y checks con id, status, scenarioType, command, evidence y threatIds correspondientes. Incluir al menos un escenario boundary/failure, sin escribir los marcadores sensibles en comandos ni evidencia.

`evidence/week-04/individual.json` tampoco se crea parcialmente: el contrato exige exactamente tres integrantes. Para Oscar (studentId 3523110806), la aportación preparada comprende safeErrors.ts, la suite nueva, la integración HTTP y esta sección. Faltan SHA propio real, resultados de verificación y la información real de los otros integrantes. Los intentos bloqueados descritos arriba no equivalen a tests ejecutados personalmente por Oscar. No se inventan aportaciones de Martín o Felipe.

La sanitización compartida `redactForTelemetry` y su integración quedan fuera de esta aportación; deberá coordinarlas su responsable. No se presupone autoría de Felipe o Martín para archivos sin evidencia de asignación. El equipo también debe completar secret-scan.json y engineering.json, además de la evidencia individual conjunta.
