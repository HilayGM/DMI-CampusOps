# Controles de seguridad y privacidad — Semana 04

## Información que puede permanecer

CampusOps usa datos sintéticos, pero los trata como sensibles al verificar el diseño. Las incidencias en memoria contienen ubicación, descripción, notas y referencias de evidencia; `course-backend/` conserva fixtures y respuestas en memoria. La sesión persistible se limita a `accessToken`, `refreshToken` y `expiresAt`. Los puntos que pueden conservar diagnósticos son `console.warn`, los resultados de Jest y los JSON de `reports/` y `evidence/`.

No existe `AsyncStorage`, `localStorage` ni un almacén de preferencias para sesión. Los archivos de evidencia usan datos ficticios y no incluyen valores de tokens, ubicaciones, nombres, fotografías ni comentarios usados por las pruebas negativas.

## Controles implementados

| Amenaza | Control | Verificación |
| --- | --- | --- |
| T3: comentario interno en logs o reportes | `redactForTelemetry` elimina comentarios, notas y texto libre; `toSafeError` devuelve sólo código y mensaje permitidos. | Suite negativa con comentario, notas y objetos anidados. |
| T4: ubicación o fotografía en diagnósticos | El sanitizador recorre objetos y listas, reemplaza ubicación, coordenadas, fotos y evidencia, y no muta la entrada. | Pruebas de arrays, estructuras anidadas e inmutabilidad. |
| T5: token, sesión o credencial en errores | La frontera HTTP emite `recordSafeTelemetry` con un clon redactado y después expone sólo `SafeError`. | Fetch rechazado con datos ficticios y captura de `console.warn`. |
| T6: persistencia insegura de sesión | `ExpoSecureSessionStore` guarda sólo los tres campos de sesión en `expo-secure-store`; no usa almacenamiento de preferencias. | Prueba con cliente simulado, minimización de campos y lectura fallida silenciosa. |

## Elección de almacenamiento

Se eligió Expo SecureStore en lugar de AsyncStorage porque los tokens requieren la protección nativa de la plataforma. En iOS se usa `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, para evitar migrar el registro a otro dispositivo mediante restauraciones. Se descartó guardar el perfil completo: incluso en un almacén protegido, nombre, ubicación, incidencias, fotografías y comentarios no son necesarios para recuperar una sesión.

El adaptador se registra en la composición de CampusOps. La interfaz actual todavía no tiene un flujo de inicio/cierre de sesión, por lo que no debe simularse una persistencia de perfil para aparentar cobertura.

## Sanitización y errores seguros

`redactForTelemetry` normaliza claves y cubre el contrato de `docs/CAMPUSOPS_API.md`, incluidas claves anidadas y listas: autorización, contraseñas, tokens, identidad, asignaciones, ubicación/coordenadas, fotos/evidencia y comentarios internos. Mantiene únicamente campos técnicos como `incidentId`, `status`, `attempt` y `durationMs`.

La integración real está en `src/api/courseBackend.ts`. Ante un fallo de salud, `recordSafeTelemetry('backend_health_failed', …)` envía al único sink de diagnóstico un objeto clonado y redactado; un error del sink no altera el error de la aplicación. Después, `toSafeError` devuelve el contrato seguro de dos campos. No se registran cuerpos de respuesta HTTP fallida.

## Resultados y riesgo residual

Se ejecutaron correctamente `npm.cmd run typecheck`, `npm.cmd run lint` y las suites pública, negativa y de SecureStore (19 pruebas). Los resultados reproducibles se conservan en `reports/week-04/`.

El control no protege bibliotecas externas que registren datos antes de llegar a esta frontera, un dispositivo comprometido o desbloqueado, ni convierte el backend didáctico en autenticación productiva. Los reportes de herramientas también deben mantenerse sin valores sensibles; por ello el escaneo se conserva como comprobación separada.
