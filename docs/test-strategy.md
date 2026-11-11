# Estrategia acumulativa de pruebas y cobertura por riesgo — Semana 11

## 1. Objetivo, alcance y fuentes

CampusOps debe conservar el comportamiento de consulta, creación y atención de incidencias mientras evoluciona su seguridad, sesión, sincronización y resiliencia. Semana 11 exige reproducir un defecto, explicar su mecanismo causal, conservar una regresión y comprobar comportamiento equivalente en debug y release. La cobertura cuantitativa complementa esas comprobaciones; no acredita por sí sola el flujo completo.

Este documento corresponde a la aportación documental de Oscar Martínez Martínez, integrante 3 del equipo 09. El corte de comprobación es el 11 de noviembre de 2026, en Windows/PowerShell, rama `dev-oscar`. El código comprobado corresponde a `2a7ad15b9f567a7acce7838076dfc5e421958ba7`; la implementación documental conserva ese código sin cambios. Ese identificador es la base inspeccionada, no un SHA final de entrega ni un commit propio de Oscar.

El entorno disponible utilizó Node.js `v26.13.0`, aunque `.nvmrc` y la guía de entrega requieren `22.22.0`. Los resultados locales deben reproducirse con la versión requerida antes de acreditar AC-01. No se instalaron dependencias ni se cambiaron versiones, pruebas, snapshots, umbrales o configuración.

Se emplean tres estados de evidencia:

- **VERIFICADO:** archivo inspeccionado o resultado observado de un comando identificado en este documento.
- **INFERIDO:** conclusión razonada a partir del código, sin una comprobación funcional suficiente.
- **PENDIENTE:** falta ejecución, artefacto o corroboración; no equivale automáticamente a una funcionalidad defectuosa.

Fuentes normativas, en orden de aplicación:

1. [Actividad Week 11](assignments/week-11.md), especialmente líneas 13–33 y 48–54: acumulación, variantes, cobertura y entregables.
2. [Rúbrica Week 11](assignments/week-11-rubric.md), líneas 9–15 y 35–48: AC-01 a AC-05, niveles y límites.
3. [Guía de repositorio Week 11](assignments/week-11-repository.md), líneas 14–20 y 26–61, y [contrato de evidencia](EVIDENCE_CONTRACT.md), líneas 21–31.
4. [Contrato CampusOps](CAMPUSOPS_API.md), líneas 38–56, y [alcance del caso](CAMPUSOPS.md), líneas 29–58: los adaptadores y dobles no sustituyen integración, persistencia ni recursos nativos.
5. [Skill de evaluación DMI](../skills/dmi-evaluacion-skill.md), líneas 8–18 y 35–55, y [skill de revisión individual](../skills/revision-aporte-individual-skill.md), líneas 30–62 y 103–105: revisión acotada, evidencia atribuible y separación entre hechos e inferencias.

La ruta solicitada `skills/dmi-evaluation-skill.md` no existe; se leyó íntegramente su equivalente disponible `skills/dmi-evaluacion-skill.md`. Ambos skills describen procedimientos de evaluación/revisión, no una implementación móvil ni comandos adicionales de pruebas. `RUBRIC_PUBLIC.md` no existe en raíz; la rúbrica específica de `docs/assignments/` es la fuente vigente. Las copias de `.agent/activity/` corresponden a Semana 8 y `LEEME_PRIMERO.md` a Semana 1. La discrepancia del quiz entre `.agent/activity.md:44` y `docs/assignments/week-11.md:95` no altera los AC técnicos; se prioriza la consigna específica. No se asigna una calificación global en esta revisión individual.

## 2. Inventario acumulativo

Las rutas siguientes son reales. **Inspeccionar una suite no significa que haya pasado.** La columna de límite delimita lo que sus aserciones pueden respaldar; los resultados de ejecución se identifican en la sección 6.

| Grupo                                             | Suite y referencia                                                                                                                                                                    | Comportamiento comprobable y límite                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seguridad y privacidad                            | [tests/security.spec.ts](../tests/security.spec.ts), líneas 39–70                                                                                                                     | Escaneo estático de superficies y patrones de secretos. No prueba cifrado ni autorización del backend; la clasificación de fixtures tiene un fallo observado.                            |
| Seguridad y privacidad                            | [securityNegativePaths.test.ts](../src/campusops/_tests_/securityNegativePaths.test.ts), líneas 50–215                                                                                | Errores seguros, ausencia de marcadores sensibles, HTTP sustituido y sesión mínima. No acredita almacenamiento nativo.                                                                   |
| Seguridad y privacidad                            | [SafeTelemetry.test.ts](../src/campusops/tests/SafeTelemetry.test.ts), líneas 6–88                                                                                                    | Redacción recursiva, claves técnicas, ciclos, inmutabilidad y accessors no ejecutados. Que esta suite interna pase no resuelve la discrepancia con la prueba pública Week 4.             |
| Autenticación y sesión                            | [ExpoSecureSessionStore.test.ts](../src/campusops/_tests_/ExpoSecureSessionStore.test.ts), líneas 25–73                                                                               | Guardado mínimo, lectura, eliminación de registros malformados y logout con cliente protegido sustituido. No demuestra cifrado del dispositivo.                                          |
| Autenticación y sesión                            | [SessionRefreshCoordinator.test.ts](../src/campusops/_tests_/SessionRefreshCoordinator.test.ts), líneas 4–103                                                                         | Refresh compartido, generaciones, expiración, tokens inválidos y logout mediante eventos. No sustituye tráfico HTTP.                                                                     |
| Autenticación y sesión                            | [SessionService.test.ts](../src/campusops/_tests_/SessionService.test.ts), líneas 86–368                                                                                              | Login, expiración con reloj inyectado, tres solicitudes concurrentes, reintento único y carreras refresh/logout/login. Transporte y almacén son dobles.                                  |
| Autorización                                      | [incidentAuthorization.test.ts](../src/campusops/_tests_/incidentAuthorization.test.ts), líneas 26–97                                                                                 | Creación por reportante, resolución por técnico asignado y cierre/reapertura por coordinación. No sustituye la autorización del servidor.                                                |
| Consulta y contratos                              | [incidentQueries.test.ts](../src/campusops/_tests_/incidentQueries.test.ts), líneas 7–92                                                                                              | Lista determinista, detalle por ID, ausencia, errores y protección de fixtures. Predominan repositorios locales/sustitutos.                                                              |
| Consulta y contratos                              | [HttpIncidentRepository.test.ts](../src/campusops/_tests_/HttpIncidentRepository.test.ts), líneas 72–351                                                                              | Lista/detalle/creación, dominio, headers, 403/409/500, JSON inválido, timeout y sanitización mediante transporte simulado.                                                               |
| Consulta y contratos                              | [remoteResourceParser.test.ts](../src/campusops/_tests_/remoteResourceParser.test.ts), líneas 4–77                                                                                    | Sobre válido, payload null, campos futuros, ocho entradas inválidas, no mutación y objetos hostiles. Valida el sobre, no todo el dominio.                                                |
| Sincronización offline, conflictos e idempotencia | [sync.test.ts](../src/course-evaluation/_tests_/sync.test.ts), líneas 4–48, y [públicas Week 8](../course-tests/public/week-08.test.ts), líneas 3–32                                  | Comparación JSON, conflicto, combinación y primera operación conservada. Son funciones puras, no un flujo integrado de sincronización.                                                   |
| Persistencia                                      | [OfflineOperationQueue.test.ts](../src/campusops/_tests_/OfflineOperationQueue.test.ts), líneas 16–207                                                                                | Identidad, reconstrucción de instancia, notas, URI, confirmación selectiva y corrupción controlada. Usa `MemoryKeyValueStore`: no termina el proceso ni demuestra durabilidad.           |
| Migraciones                                       | [MigrationRollback.test.ts](../src/campusops/tests/MigrationRollback.test.ts), líneas 101–214                                                                                         | Migración nominal, esquema actualizado y rollback ante falla v2. El rollback es implementado por el doble `MemoryMigrationDatabase`, líneas 27–36; no se prueba SQLite real.             |
| Resiliencia remota                                | [retry.test.ts](../src/course-evaluation/_tests_/retry.test.ts), líneas 4–53, y [públicas Week 9](../course-tests/public/week-09.test.ts), líneas 12–30                               | Backoff 1000/2000/4000 ms, corte desde intento 4, Retry-After y POST con clave. Planificar no demuestra que la UI ejecute los reintentos.                                                |
| Respuesta perdida e idempotencia                  | [LostResponseFaultInjection.test.ts](../src/campusops/_tests_/LostResponseFaultInjection.test.ts), líneas 69–227                                                                      | Timeout y replay con la misma clave, estado y versión esperados. El historial único se cuenta sobre un fixture preconstruido, líneas 187–192; no prueba deduplicación real del servidor. |
| Ubicación y caché                                 | [IncidentLocationResolver.test.ts](../src/campusops/_tests_/IncidentLocationResolver.test.ts), líneas 9–219                                                                           | Coordenadas válidas/límite, fallback manual, datos inválidos y caché con TTL/capacidad. No acredita un proveedor externo ni su integración desde la pantalla.                            |
| Estados de UI                                     | [IncidentUiStateMachine.test.tsx](../src/campusops/_tests_/IncidentUiStateMachine.test.tsx), líneas 13–216                                                                            | Carga, éxito, vacío, error, cancelación, offline, pendiente/conflicto y acciones accesibles en máquina/componente. No demuestra su conexión completa con la pantalla principal.          |
| Navegación                                        | [incidentNavigation.test.tsx](../src/campusops/_tests_/incidentNavigation.test.tsx), líneas 71–256                                                                                    | Lista/detalle/regreso, sesión, recuperación, respuesta obsoleta, BackHandler y creación con UUID. Renderizado bajo Jest; un timeout y una repetición aprobada constan en la sección 6.   |
| Respuestas obsoletas                              | [reduceRemoteResponses.test.ts](../src/course-evaluation/tests/reduceRemoteResponses.test.ts), líneas 4–43, y [públicas Week 10](../course-tests/public/week-10.test.ts), líneas 3–20 | Conservan la intención activa y descartan respuestas antiguas. No prueban por sí solas concurrencia en Android release.                                                                  |
| Regresión Week 11                                 | [RegressionDefectRelease.test.ts](../src/campusops/_tests_/RegressionDefectRelease.test.ts), líneas 5–120                                                                             | Cinco casos de propiedades heredadas/getters, igualdad con literal y rechazo de dos límites. El nombre de la suite no selecciona un build release.                                       |

Pruebas públicas y de arquitectura complementarias:

- [Smoke](../course-tests/smoke.test.tsx), líneas 5–16: montaje y salud sustituida, no flujo completo.
- [Week 1](../course-tests/public/week-01.test.ts), líneas 3–9: presencia de falla/corrección histórica y documentos.
- [Week 2](../course-tests/public/week-02.test.ts), líneas 3–9: diagrama y ADR; no inspección funcional de toda la arquitectura.
- [Week 2 arquitectura](../course-tests/public/week-02-architecture.test.ts), líneas 19–21 y 39–60: inspección de imports. Su clasificador toma el primer segmento bajo `src`, que en las capas anidadas obtiene `campusops`; un resultado verde tiene ese límite.
- [Week 3](../course-tests/public/week-03.test.ts), líneas 4–52: workflow, amenazas y escaneo de patrones; se observó un fallo en este último.
- [Week 4](../course-tests/public/week-04.test.ts), líneas 3–50: contrato público de sanitización; falla la conservación del header `accept`.
- [Week 5](../course-tests/public/week-05.test.ts), líneas 3–10: cinco entradas del parser.
- [Week 6](../course-tests/public/week-06.test.ts), líneas 3–20: refresh compartido y logout por eventos.
- [Week 11](../course-tests/public/week-11.test.ts), líneas 3–7: strings de causa/corrección/prueba y declaración de variantes. No ejecuta el defecto ni Android.
- [Backend didáctico](../course-backend/campusops-self-test.mjs), líneas 18–67: roles, reasignación, respuesta perdida, idempotencia, evidencia y geocodificación contra el servidor de prueba. `npm run backend:self-test` no se ejecutó en este corte y no prueba el cliente móvil.

## 3. Matriz de cobertura por riesgo

La severidad expresa impacto de negocio propuesto, no una probabilidad medida ni una nota académica. Se priorizan integridad del trabajo y autorización porque una falsa confirmación, una sobrescritura o una acción ajena puede alterar la atención de incidencias. Los identificadores V1–V7 remiten al registro de ejecución de la sección 6.

| Riesgo de negocio                                         | Severidad y justificación                                            | Suites y escenario                                                                                               | Evidencia disponible                                                                             | Riesgo residual                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Filtrar sesión, ubicación o comentarios                   | Alta: divulgar datos rebasa el permiso de consulta de una incidencia | `securityNegativePaths`, `SafeTelemetry`, `security.spec`; errores, estructuras anidadas y detección de patrones | V4: suites de redacción aprobadas; detector interno fallido. V2: contrato público Week 4 fallido | Desacuerdo de contrato y clasificación de fixtures; no hay auditoría de logs de una instalación |
| Mutar una incidencia sin perfil/asignación                | Alta: modificar atención ajena compromete la integridad del flujo    | `incidentAuthorization`; 403 y ausencia de llamada mutante                                                       | Suite aprobada en V4                                                                             | Backend real y reasignación durante la operación no acreditados por esos dobles                 |
| Restaurar una sesión obsoleta o generar refresh ilimitado | Alta: acceso inválido o tormenta de solicitudes                      | `SessionService`, `SessionRefreshCoordinator`, SecureStore; concurrencia, expiración y logout                    | Suites aprobadas en V4; públicas Week 6 aprobadas en V2                                          | Cifrado nativo y ciclo real del proceso pendientes                                              |
| Perder notas y operaciones al cerrar la app               | Alta: trabajo técnico no recuperable                                 | `OfflineOperationQueue`; nueva instancia, notas, URI y confirmación selectiva                                    | Suite aprobada en V4                                                                             | Almacén `Map` en memoria; no prueba cierre de proceso ni existencia del archivo de foto         |
| Dejar datos a medias durante una migración                | Alta: esquema incoherente e incidencias inaccesibles                 | `MigrationRollback`; falla v2 y preservación de pendientes                                                       | Suite aprobada en V4                                                                             | Atomicidad del motor real y recuperación instalada pendientes                                   |
| Sobrescribir una reasignación con trabajo antiguo         | Alta: atención por técnico incorrecto y pérdida de intención         | `sync` y pública Week 8; conflicto del campo `work`                                                              | Ambas suites aprobadas en V4/V2                                                                  | Cola y HTTP siguen separados; no hay sincronización completa demostrada                         |
| Duplicar resolución tras perder confirmación              | Alta: historial/efectos repetidos                                    | `LostResponseFaultInjection`, `retry`; timeout, misma clave y límite de intento                                  | Suites aprobadas en V4; públicas Week 9 aprobadas en V2                                          | El servidor es simulado; historial único del fixture no acredita deduplicación efectiva         |
| Bloquear reporte ante falla de geocodificación            | Media: retrasa registro, con alternativa manual definida             | `IncidentLocationResolver`; null, 429 como dato, coordenadas inválidas y TTL                                     | Suite aprobada en V4                                                                             | Proveedor HTTP externo, caché integrada y captura manual funcional pendientes                   |
| Reemplazar intención activa o dejar UI sin recuperación   | Alta: mostrar incidencia equivocada o impedir continuar atención     | `reduceRemoteResponses`, estados y navegación; respuestas tardías, cancelar/reintentar                           | Reductor y estados aprobados en V4; navegación con timeout en V4 y 10/10 en V5                   | Variabilidad no diagnosticada y ausencia de prueba Android en ambas variantes                   |
| Rechazar un sobre válido por su representación            | Alta: consulta/atención quedan bloqueadas pese a datos válidos       | Regresión y parser; herencia, getters, paridad y límites                                                         | V3: 18/18; arnés histórico de auditoría descrito en sección 4                                    | Vínculo exclusivo con release aún no acreditado; getters pueden producir efectos secundarios    |
| Acreditar calidad solo por porcentajes                    | Alta: cerrar entrega con defectos conocidos                          | Cobertura más pruebas funcionales, reportes y trazabilidad                                                       | V2 supera mínimos, pero tiene 3 pruebas fallidas                                                 | Los umbrales solo miden `src/course-evaluation/index.ts`                                        |

La cola predeterminada usa `MemoryKeyValueStore` y un `Map` compartido: [OfflineOperationQueue.ts](../src/campusops/infrastructure/persistence/OfflineOperationQueue.ts), líneas 55–65 y 137–142. `listPending` devuelve `[]` ante corrupción/error, líneas 148–166: evitar una excepción no acredita recuperar el trabajo. La [política de sincronización](sync-policy.md), líneas 21–25, reconoce la integración pendiente. La composición actual conecta HTTP y sesión, no ese coordinador: [campusOpsDependencies.ts](../src/composition/campusOpsDependencies.ts), líneas 22–35. Estos límites prevalecen sobre afirmaciones históricas de durabilidad no corroboradas.

## 4. Defecto Week 11: mecanismo causal y regresión

### Condiciones, síntoma y causa

El sobre público contiene `id`, `version`, `status` y `payload`; el ID/estado no deben estar vacíos, la versión debe ser entera no negativa y el payload debe ser objeto o null. El parser no sustituye la validación del dominio de incidencia: [CAMPUSOPS_API.md](CAMPUSOPS_API.md), línea 38, y [HttpIncidentRepository.ts](../src/campusops/infrastructure/HttpIncidentRepository.ts), líneas 28–41.

La versión anterior se puede inspeccionar sin cambiar de checkout:

```powershell
git show e64a785^:src/campusops/infrastructure/RemoteResourceParser.ts
```

En esa revisión, `readOwnDataProperty` utilizaba `Object.getOwnPropertyDescriptor(input, key)` y aceptaba únicamente descriptores con `value`. La causa tiene dos mecanismos distintos:

1. En `Object.create(envelopeProto)`, los campos son heredados: no existe descriptor propio en la instancia.
2. Un getter propio sí puede tener descriptor, pero este contiene un accessor y no la propiedad `value` esperada.

El síntoma es `{ ok: false, error: 'contract' }` para esas representaciones de un sobre válido. El resultado esperado es `{ ok: true, value: ... }` con los mismos ID, versión, estado y payload. Decir solamente que la consulta falla describe el síntoma; identificar la dependencia de descriptores propios de datos explica por qué sucede.

### Corrección existente y aserciones

La corrección de Martín ya integrada utiliza `readSafeProperty`: comprueba `key in input` y lee la propiedad bajo protección de excepciones. El parser mantiene la validación de tipos/campos y el rechazo controlado: [RemoteResourceParser.ts](../src/campusops/infrastructure/RemoteResourceParser.ts), líneas 12–18 y 32–52. Esta aportación documental no modifica esa implementación.

La regresión existente verifica:

| Caso                                   | Aserción concreta                           | Referencia en `RegressionDefectRelease.test.ts` |
| -------------------------------------- | ------------------------------------------- | ----------------------------------------------- |
| Sobre heredado válido                  | `toEqual` del sobre completo con `ok: true` | Líneas 19–34                                    |
| Getters válidos                        | `toEqual` del resultado completo            | Líneas 39–71                                    |
| Literal y prototipo con mismos valores | Ambos `ok` verdaderos y resultados iguales  | Líneas 86–93                                    |
| Versión negativa heredada              | Error de contrato                           | Líneas 98–108                                   |
| Estado requerido ausente               | Error de contrato                           | Líneas 111–120                                  |

El contraste aísla la representación de propiedades y comprueba el contenido del resultado; por ello prueba el mecanismo causal del rechazo. Los casos negativos evitan concluir que aceptar cualquier entrada sería una corrección suficiente.

### Resultados verificados y límites

- **VERIFICADO en esta ejecución (V3):** Jest aprobó las dos suites de regresión/contrato, 18 pruebas y 0 snapshots, código 0. Son 5 casos de regresión y 13 del parser en la implementación actual.
- **Evidencia de auditoría previa:** un arnés síncrono en memoria transpiló el archivo de regresión sin editarlo contra el parser de `e64a785^` y contra el actual: antes 2/5 aprobados y 3/5 fallidos; después 5/5 aprobados. No fue el runner oficial de Jest ni Android, y no se presenta como una nueva ejecución en esta fase.
- **PENDIENTE:** ejecución oficial anterior reproducible y evidencia que muestre cuándo un DTO con esa representación llega desde el flujo instalado.
- **PENDIENTE:** demostrar que el fallo es exclusivo de release y que Hermes/Metro producen la transformación afirmada en comentarios y en [defect-trace.json](../reports/week-11/defect-trace.json), línea 6. El test construye objetos explícitamente; no ejecuta dos motores ni dos builds.

La ruta HTTP llama a `response.json()` antes del mapeo: [HttpIncidentRepository.ts](../src/campusops/infrastructure/HttpIncidentRepository.ts), líneas 105–109. Su vínculo con una transformación a propiedades heredadas/getters no queda demostrado por la suite. La regresión acredita compatibilidad del parser; una regresión histórica exclusiva de release requiere evidencia adicional.

Riesgo residual: la lectura nueva ejecuta getters. Capturar una excepción no revierte efectos secundarios. El caso hostil del parser, líneas 69–77 de su suite, verifica rechazo controlado pero no comprueba que el getter permanezca sin ejecutar. Tampoco se acredita una defensa universal ante cadenas de prototipos alteradas.

El reporte de Martín existe y se conserva sin cambios. Su SHA `e64a7853d0fea3e4f1894b829446b5c219f37b5d` no es HEAD ni su primer padre en este corte; debe actualizarse conforme a la revisión final. El check anterior, líneas 11–15, declara `pass` y repite el comando sin precisar la revisión anterior: necesita aclaración del responsable, no una reinterpretación silenciosa como ejecución antes/después oficial.

## 5. Estrategia funcional debug/release

**Estado: PENDIENTE.** `reports/week-11/debug-release.json` no existe en este corte. Felipe es responsable de su comprobación y reporte según la ficha compartida. No se realizó instalación, prueba nativa ni exportación release durante esta implementación documental.

La comparación debe utilizar el mismo SHA de código, backend/control de escenarios, datos sintéticos, actor, versión base e identidad de operación. Para cada variante se debe registrar dispositivo/emulador y versión Android, motor y configuración efectiva, comandos de construcción/instalación/ejecución realmente usados, condiciones iniciales, entrada, esperado, observado y código de salida cuando corresponda. Un nombre de test, `NODE_ENV` o una etiqueta de objeto no identifica por sí solo un build nativo.

| Escenario a repetir en ambas variantes        | Criterio observable de equivalencia                                                   | Comprobación restante                                                            |
| --------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Login, lista y detalle por ID                 | Sesión correcta y misma incidencia visible según actor                                | Ejecutar flujo en app instalada                                                  |
| Consulta y representación del DTO del defecto | Igual resultado de dominio; conservar la representación que dispara el fallo anterior | Capturar origen del DTO y reproducir antes/después sin desactivar optimizaciones |
| Respuesta inválida, 500 y timeout             | Error seguro, recuperación accesible y ausencia de éxito inventado                    | Inyectar escenarios controlados y observar UI/logs sanitizados                   |
| Refresh concurrente y logout                  | Un refresh, reintento acotado y ninguna sesión restaurada tardíamente                 | Repetir ciclo integrado                                                          |
| Cambio offline y reasignación remota          | Conservar intención y asignación, conflicto visible, sin sobrescritura silenciosa     | Resolver primero integración offline pendiente; funciones puras no bastan        |
| Reinicio con pendientes y respuesta perdida   | Recuperar misma operación; solo un efecto y retirar solo lo confirmado                | Almacén durable y replay contra backend                                          |
| Respuestas obsoletas y recuperación de UI     | Mostrar intención activa; cancelar, volver y reintentar sin bloqueo                   | Repetir interacción y registrar temporalidad                                     |

Los scripts existentes `npm run bundle:release`, `npm run package:android:ci` y `npm run package:android` corresponden respectivamente a exportación Expo, generación nativa/assembleDebug y generación nativa/assembleRelease: [package.json](../package.json), líneas 22–25. Son pasos de construcción, no pruebas funcionales. El responsable debe registrar los comandos compatibles con su entorno, instalación y ejecución efectiva; esta estrategia no inventa un comando nativo ni un resultado ausente.

El reporte debe incluir `schemaVersion: 1`, `week: 11`, `commitSha`, `generatedAt`, `variants` con debug y release, y `checks` con `id`, `status`, `scenarioType`, `command` y `evidence`; al menos un escenario debe ser de límite/falla. Sus observaciones deben corresponder a ejecuciones reales, incluyendo diferencias o bloqueos. La prueba pública solo lee esos campos: no demuestra el comportamiento que se declara.

## 6. Cobertura cuantitativa, ejecuciones y reproducción

### Registro real de esta ejecución

Los comandos se ejecutaron con dependencias existentes, en el entorno y base de código indicados en la sección 1. En PowerShell se utilizó `npm.cmd`, equivalente de invocación del ejecutable npm en Windows. Las salidas completas están en la sesión de ejecución; no se crearon reportes personalizados ni se alteraron los de compañeros.

| ID  | Comando                                                                                                                                        | Código | Resultado observado y limitación                                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | `npm.cmd run test:coverage:week11`                                                                                                             | 1      | `SyntaxError: Expected property name or '}' in JSON at position 1`; falla al interpretar `coverageThreshold`, antes de ejecutar pruebas. No produce métricas atribuibles a V1.                            |
| V2  | Lanzador Node de abajo: conserva los argumentos publicados y llama a `jest.run(args)`                                                          | 1      | 11 suites: 8 aprobadas/3 fallidas; 25 pruebas: 22 aprobadas/3 fallidas; 0 snapshots. Generó cobertura real con el mismo alcance y umbrales. No se declara aprobado el script npm original.                |
| V3  | `npm.cmd test -- --ci --runInBand src/campusops/_tests_/RegressionDefectRelease.test.ts src/campusops/_tests_/remoteResourceParser.test.ts`    | 0      | 2 suites y 18 pruebas aprobadas; 0 snapshots. No ejecuta Android ni el parser histórico.                                                                                                                  |
| V4  | `npm.cmd test -- --ci --runInBand src/campusops src/course-evaluation tests/security.spec.ts course-tests/public/week-02-architecture.test.ts` | 1      | 21 suites: 19 aprobadas/2 fallidas; 226 pruebas: 224 aprobadas/2 fallidas; 0 snapshots. Fallan clasificación de fixtures en seguridad y un timeout de navegación. No sustituye la selección de cobertura. |
| V5  | `npm.cmd test -- --ci --runInBand src/campusops/_tests_/incidentNavigation.test.tsx`                                                           | 0      | Repetición diagnóstica sin cambios: 1 suite/10 pruebas aprobadas; 0 snapshots. No borra el timeout previo ni acredita estabilidad.                                                                        |
| V6  | `node node_modules/typescript/bin/tsc --noEmit --incremental false`                                                                            | 0      | Sin diagnósticos; sin emisión ni archivo incremental. No acredita funcionamiento.                                                                                                                         |
| V7  | `node node_modules/eslint/bin/eslint.js . --no-cache`                                                                                          | 1      | Un error `no-var` en `.venv/Lib/site-packages/pip/_vendor/urllib3/contrib/emscripten/emscripten_fetch_worker.js:72:7`. No se aplicó `--fix` ni se cambiaron exclusiones.                                  |

V1 falla en el transporte de comillas del argumento JSON a través del shell de npm en Windows. Para distinguir ese bloqueo de los resultados funcionales, V2 analizó el script existente con la dependencia instalada `shell-quote` y ejecutó Jest en el mismo proceso. No editó el script, no alteró porcentajes y no omitió pruebas de su selección:

```powershell
@'
const fs = require('node:fs');
const { parse } = require('shell-quote');
const { run } = require('jest');
const script = JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts['test:coverage:week11'];
const args = parse(script);
if (args.shift() !== 'jest' || args.some(arg => typeof arg !== 'string')) {
  throw new Error('Unexpected coverage script structure');
}
const threshold = args.find(arg => arg.startsWith('--coverageThreshold='));
console.log('Arguments preserved from package.json:', JSON.stringify(args));
console.log('Threshold JSON:', JSON.stringify(JSON.parse(threshold.slice('--coverageThreshold='.length))));
run(args).catch(error => { console.error(error); process.exitCode = 1; });
'@ | node -
```

### Métricas medidas y selección

El comando oficial es `npm run test:coverage:week11`, definido en `package.json:20`. El alcance instrumentado es exclusivamente `src/course-evaluation/index.ts`; sustituye el alcance general de `src/**/*.{ts,tsx}` configurado en las líneas 53–56. V2 conserva esa selección y produce `coverage/coverage-summary.json` con estos valores:

| Métrica    | Umbral mínimo | Medición V2 | Elementos cubiertos/total | Interpretación                             |
| ---------- | ------------- | ----------- | ------------------------- | ------------------------------------------ |
| Ramas      | 60%           | 75.32%      | 58/77                     | Supera el mínimo del archivo instrumentado |
| Funciones  | 65%           | 83.33%      | 15/18                     | Supera el mínimo del archivo instrumentado |
| Líneas     | 70%           | 90.90%      | 60/66                     | Supera el mínimo del archivo instrumentado |
| Sentencias | 70%           | 87.67%      | 64/73                     | Supera el mínimo del archivo instrumentado |

Las cifras son medidas, no estimadas, y no cambian el código de salida 1 de V2. Las líneas no cubiertas reportadas son 17, 39–40, 98, 157 y 193; incluyen rutas de clonación, reintento y funciones pendientes. `reducePermissionLifecycle`, líneas 190–193, pertenece al avance futuro y sigue dentro del archivo instrumentado; no se excluyó para mejorar la cifra.

La selección publicada contiene once archivos: `course-tests/smoke.test.tsx` y `course-tests/public/week-{01,02,03,04,05,06,08,09,10,11}.test.ts`. Las públicas Week 5, 6, 8, 9 y 10 ejecutan adaptadores/lógica de `index.ts`; las pruebas documentales no deben presentarse como pruebas funcionales aunque formen parte del mismo comando. Reexportar o invocar código de otro archivo no incorpora sus cuerpos a este porcentaje.

No se seleccionan las suites internas del inventario, `tests/security.spec.ts` ni `week-02-architecture.test.ts`. Por tanto, V3, V4 y V5 aportan comprobaciones complementarias por riesgo, no los porcentajes de V2. Las implementaciones de parser, SessionService, SecureStore, cola, migraciones, UI, caché y telemetría no quedan cuantitativamente acreditadas por medir solo `index.ts`.

### Fallos que impiden declarar aprobación

1. **V2 / Week 11:** `ENOENT` al leer `reports/week-11/debug-release.json`, en `course-tests/public/week-11.test.ts:6`. Es una dependencia real del reporte de variantes; no se creó uno ficticio.
2. **V2 / Week 3:** el escaneo marca `src/campusops/tests/SafeTelemetry.test.ts`, en `course-tests/public/week-03.test.ts:52`. Se corroboró por inspección y aplicación del patrón que coincide con un fixture sintético de las líneas 16–19. No demuestra una credencial real expuesta, pero la prueba permanece fallida y requiere resolución del equipo sin debilitar el control.
3. **V2 / Week 4:** se espera `request.headers.accept: 'application/json'`, pero se obtiene `[REDACTED]`, en `course-tests/public/week-04.test.ts:12`. Es una discrepancia real entre contrato probado y redacción por defecto, no un fallo atribuible a la documentación nueva.
4. **V4 / seguridad interna:** `tests/security.spec.ts:63` encuentra `credential assignment` en el corpus inspeccionado. Existe el fixture sintético señalado por el detector público; el hallazgo interno requiere confirmar todos sus orígenes antes de concluir que el corpus completo solo contiene falsos positivos.
5. **V4 / navegación:** el caso `incidentNavigation.test.tsx:71` excede 15000 ms. V5 repite la suite completa sin aumentar timeout y aprueba 10/10; la causa de la variabilidad sigue pendiente. No se descartó ni desactivó el caso.
6. **V7 / lint:** el error está en una dependencia Python local; el lint global continúa fallido. Corregir el entorno o las exclusiones corresponde a una tarea autorizada separada.

La cobertura cuantitativa indica qué código medido se ejecutó. La cobertura por riesgo relaciona fallas relevantes, escenarios y aserciones. La comprobación funcional contrasta resultados del flujo bajo condiciones concretas, incluidas variantes instaladas. Superar los mínimos puede coexistir con pruebas fallidas, un reporte ausente, persistencia no durable o una autorización sin probar en el servidor; por eso no se acepta como único criterio de éxito.

Los comandos Jest pueden crear o actualizar `.jest-cache/` y V2 escribe `coverage/coverage-summary.json`, ambos ignorados por Git. Se preservan como artefactos locales de ejecución, sin agregarlos al commit documental. Los modos completos del evaluador escriben `verify.json`, `public-tests.json` o `failure.json` bajo `reports/week-11/`, incluso sin `--execute-toolchain`: [course_public_evaluator.py](../tools/course_public_evaluator.py), líneas 283–286. No se ejecutaron en esta fase para respetar el alcance de edición. Tampoco se ejecutaron auditoría con red, bundle, APK o backend self-test.

## 7. Criterios verificables de aceptación

Se distingue entre preparar la aportación documental y cerrar la entrega del equipo. Un pendiente externo no se atribuye a Oscar como cambio propio, pero impide declarar aprobado el requisito compartido.

| Criterio                           | Condición de cierre                                                                                                                             | Estado en este corte                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| AC-01 — reproducción               | Versión Node requerida, instalación reproducible y `make feedback`/`make verify-week-11` aprobados sobre revisión entregada; conservar reportes | PENDIENTE: Node local distinto, lint fallido y checks completos no ejecutados                                  |
| AC-02 — comportamiento y cobertura | Regresión y límites aprobados, cuatro mínimos medidos y comportamiento equivalente debug/release observado                                      | PARCIAL: V3 y mínimos V2 comprobados; V2 fallido y variantes pendientes                                        |
| AC-03 — falla segura               | Reproducción causal antes/después, contratos preservados y recuperación funcional sin bypasses ni optimizaciones desactivadas                   | PARCIAL: parser actual comprobado y contraste previo en memoria; reproducción nativa y demás fallos pendientes |
| AC-04 — decisión                   | Conectar problema, alternativas, decisión, costo/beneficio y resultados reproducibles en `engineering.json`                                     | PENDIENTE de archivo de evidencia; razonamiento preparado en sección 9                                         |
| AC-05 — aportación individual      | Un commit propio real, archivo técnico/documental sustantivo y prueba o revisión atribuible; conservar tres fichas                              | PENDIENTE de autorización, primer commit y actualización exclusiva de la ficha de Oscar                        |
| Calidad documental asignada        | Inventario real, riesgos justificados, fuentes concretas y distinción entre medición, prueba funcional y limitación                             | Verificada: formato, enlaces y alcance; commit aún no autorizado                                               |

No se aplican notas o penalizaciones automáticas por flags. Las diferencias del detector, la temporalidad de navegación y la atribución a release se corroboran con pruebas/inspección y conservan sus límites. El cierre requiere resolver los bloqueos aplicables y no presentar esta preparación como una entrega global aprobada.

## 8. Dependencias y responsabilidades del equipo

| Responsable | Dependencia concreta                                                                                   | Evidencia necesaria para resolverla                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Martín      | Relación real del DTO con release, reproducción oficial anterior y trazabilidad del reporte de defecto | Revisión anterior identificada, comando/observaciones antes y después, origen del DTO, SHA elegible y explicación precisa de getters frente a herencia |
| Felipe      | `reports/week-11/debug-release.json` ausente                                                           | Ambas variantes funcionales con condiciones, comandos, resultados y casos límite/falla; exportar el bundle por sí solo no basta                        |
| Oscar       | Estrategia, decisión y únicamente su ficha individual                                                  | Documento revisado, primer commit autorizado y evidencia posterior que distinga asistencia de IA de ejecución humana                                   |
| Equipo      | Fallos públicos de seguridad/telemetría, detector interno, variabilidad de navegación y lint           | Diagnóstico/corrección mínima autorizada, sin alterar pruebas para forzar éxito, y repetición de checks obligatorios                                   |
| Equipo      | Integración offline, durabilidad, proveedor y recursos nativos                                         | Evidencia funcional correspondiente; no afirmar que funciones puras o dobles cubren esas integraciones                                                 |
| Equipo      | Trazabilidad final y entrega                                                                           | Revisión estable, reportes/evidencias coherentes, etiqueta final y SHA completo validados en el orden publicado                                        |

`individual.json` es un objeto raíz compartido con `schemaVersion: 1`, `week: 11`, `teamId: '09'` y exactamente tres `members`. Existe una sola ficha de Oscar. En este corte los SHA declarados por los tres miembros no resuelven mediante `git cat-file -e <sha>^{commit}`; el validador comprueba su forma, no la autoría/existencia. Cada responsable debe aportar su commit verdadero. No se modificaron fichas ajenas ni el archivo compartido en esta fase.

El workflow Week 11 ejecuta `make evidence-week-11` sin condición de etiqueta, mientras el evaluador exige que `week-11-final` resuelva a HEAD: [workflow](../.github/workflows/week-11-pruebas-diagnostico-feedback.yml), líneas 40–41, y [evaluador](../tools/course_public_evaluator.py), líneas 248–251. Se infiere un bloqueo para ejecuciones sin esa etiqueta; no se consultó un resultado remoto de Actions ni se editó el workflow.

## 9. Decisión preparada, trazabilidad y asistencia de IA

### Decisión de ingeniería preparada para la fase posterior

**Problema:** el rechazo genérico de un sobre y un porcentaje alto no identifican por sí solos la causa. **Decisión:** sustentar la explicación en entradas válidas que varían la representación de propiedades, aserciones del resultado completo y contraste con la lectura anterior; mantener la aceptación del parser separada de una atribución exclusiva a release todavía sin demostrar.

| Alternativa                                                                                      | Beneficio                                                                                        | Costo o motivo de descarte                                                                                             |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Usar cobertura o presencia de strings en reportes como evidencia suficiente                      | Comprobación rápida y reproducible                                                               | No aísla el mecanismo ni demuestra variantes; descartada como criterio de suficiencia                                  |
| Restringir el sobre a propiedades propias de datos y normalizar explícitamente en su frontera    | Lectura sin ejecutar accessors y contrato de representación más reducido                         | Requeriría justificar/cambiar la frontera y compatibilidad; no es la corrección existente ni se implementa aquí        |
| Aceptar propiedades heredadas/getters, validar valores y probar representaciones diferenciadoras | Corresponde a la corrección integrada y detecta el rechazo específico con aserciones observables | Amplía la superficie de lectura y ejecuta getters; debe declararse el riesgo y completarse la prueba funcional release |

El tradeoff consiste en ganar compatibilidad con las representaciones probadas a cambio de ejecutar accessors y requerir controles/evidencia adicionales. La documentación no afirma que capturar excepciones haga inocuo todo getter. V3 y la auditoría previa sustentan el mecanismo; V1/V2 y V4/V5 delimitan calidad acumulada y bloqueos. No se crea aún `evidence/week-11/engineering.json`.

En la fase autorizada posterior se usarán las claves reales `schemaVersion`, `week`, `commitSha`, `decision`, `alternatives`, `tradeoff`, `requirementIds` y `verification`. El validador exige strings sustantivos, dos alternativas distintas y observaciones con `command`, `result` y `evidence`: [course_public_evaluator.py](../tools/course_public_evaluator.py), líneas 105–140. Los AC relacionados serán al menos AC-02, AC-03 y AC-04, sin acreditar los pendientes. `problem`, `residualRisks` y `limitations` pueden conservar las convenciones de las evidencias históricas, sin reemplazar claves obligatorias.

### Dos commits y atribución individual

El primer commit propuesto contendrá solo `docs/test-strategy.md`, con mensaje `docs(week-11): document cumulative testing strategy and risk coverage`. Tras autorización y creación, se obtendrá su SHA completo. El segundo contendrá exclusivamente `evidence/week-11/engineering.json` y la actualización de la ficha de Oscar, con mensaje `evidence(week-11): document engineering decision and Oscar contribution`. Cada commit requiere su autorización; esta fase no ejecuta `git add` ni `git commit`.

El segundo commit de evidencia podrá referir al primero conforme a la regla del padre directo cuyos cambios posteriores se limitan a `reports/` y `evidence/`: [EVIDENCE_CONTRACT.md](EVIDENCE_CONTRACT.md), línea 23, y [evaluador](../tools/course_public_evaluator.py), líneas 51–64. Un merge o cambio documental posterior puede invalidar esa relación: el equipo debe revisar nuevamente SHA y evidencias sobre la integración final. No se crean etiquetas ni se hace push como parte de esta preparación.

La ficha futura conservará raíz y tres miembros, seleccionará exactamente una coincidencia por el identificador registrado de Oscar y no reemplazará todo el arreglo. Incluirá SHA propio, archivos reales, predicción previa a una nueva verificación, comando, resultado y explicación. Los resultados de esta sesión se atribuyen a ejecución asistida; no se inventa una predicción humana retrospectiva ni se presenta al asistente como Oscar.

### Uso de IA y control de calidad

Se utilizó asistencia material de IA para leer los skills y contratos, inspeccionar código e historial, construir inventario/matriz de riesgos, ejecutar comandos bajo autorización y redactar esta estrategia. Los resultados V1–V7 fueron observados por el asistente en el entorno de trabajo; no se afirma que Oscar los ejecutó personalmente. La ayuda se verificó contra rutas reales, aserciones, salidas, códigos y resumen de cobertura; Oscar deberá revisar y poder explicar la decisión antes de integrarla.

Se revisó el documento completo y se contrastaron sus métricas con las salidas y el resumen generado. Prettier y `git diff --check` terminaron con código 0; los 56 enlaces locales resuelven, no hay espacios finales y los 191 archivos rastreados preexistentes conservan su contenido. El archivo individual sigue intacto y no se creó el de ingeniería. Los resultados de formato/diff son controles del documento, no aprobación de AC funcionales. La asistencia y sus límites se declararán también en la evidencia posterior conforme a `week-11-repository.md:61`.

| Skill y requisito                                                   | Aplicación a Oscar                                                             | Evidencia en este documento              | Estado                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------- |
| Evaluación: consigna/rúbrica y evidencia concreta                   | Usar AC reales y fuentes de Semana 11                                          | Secciones 1, 6 y 7                       | Aplicado; no se asigna nota global                          |
| Ambos: no debilitar pruebas y separar observación/inferencia        | Preservar comandos, umbrales, fallos y límites                                 | V1–V7, secciones 4–6                     | Aplicado; checks fallidos siguen abiertos                   |
| Evaluación: corroborar flags sin deducción automática               | Distinguir fixture sintético, timeout y atribución release                     | Sección 6 y límites de sección 4         | Corroboración parcial; causas/alcances pendientes indicados |
| Revisión individual: alcance, claridad, integración y documentación | Estrategia sustantiva sin código/configuración ni archivos ajenos              | Inventario, matriz y plan de dos commits | Documento revisado; alcance confirmado antes del commit     |
| Revisión individual: atribución comprobable                         | Registrar commit propio y revisión/ejecución real, sin adjudicar trabajo ajeno | Esta sección y dependencias              | Pendiente de autorización y evidencia posterior             |
| Revisión individual: cierre con verificaciones suficientes          | No declarar lista la entrega con bloqueos                                      | Secciones 7–8                            | Pendiente de equipo y fases posteriores                     |
