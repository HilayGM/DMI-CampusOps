# Modelo inicial de amenazas — Semana 03

## 1. Alcance

Este modelo cubre el estado actual de CampusOps en Semana 03: aplicación móvil React Native / Expo, backend didáctico, almacenamiento en memoria, repositorio, GitHub Actions y logs/resultados técnicos. El dominio utiliza exclusivamente incidencias, actores, ubicaciones y evidencias sintéticas; no se autoriza introducir datos ni credenciales reales para verificar una amenaza.

La aplicación muestra lista y detalle mediante `src/campusops/infrastructure/InMemoryIncidentRepository.ts`. Su comunicación HTTP actual, en `src/api/courseBackend.ts`, consulta `/health`; todavía no integra completamente la API CampusOps. Las rutas de incidencias, login y geocodificación están implementadas en el backend didáctico y son ejercitadas por sus pruebas, no por los flujos móviles completos.

No existe una base de datos externa, autenticación productiva ni plataforma productiva de monitoreo. El backend conserva estructuras en memoria. Su evidencia fotográfica consiste en referencias/identificadores (`evidenceId`), no fotografías reales almacenadas. Sesión segura, persistencia, sincronización, captura/carga de imágenes y sanitización completa corresponden a avances posteriores; los contratos o pruebas de esas semanas no acreditan una implementación actual.

El documento distingue controles observados en código de controles propuestos. Las verificaciones se describen por su alcance; no se ejecutaron pruebas ni se registran resultados nuevos en esta etapa.

## 2. Activos que deben protegerse

Cada activo se vincula con rutas existentes. La importancia de protegerlo no implica que contenga información real en este entorno académico.

| ID | Activo | Ubicación real en el proyecto | Qué debe protegerse | Motivo de protección |
| --- | --- | --- | --- | --- |
| A1 | Incidencias | `src/campusops/domain/Incident.ts`; `src/campusops/infrastructure/InMemoryIncidentRepository.ts`; `course-backend/campusops.mjs` | ID, título/descripción, categoría y payload; versión en el backend. | Evitar consulta ajena y alteración de la información del caso. |
| A2 | Estados de incidencias | `src/campusops/contracts.ts`; `course-backend/campusops.mjs` | `open`, `assigned`, `in_progress`, `resolved`, `closed`, transiciones y versión. | Mantener integridad y evitar que la operación muestre atención o cierre falsos. |
| A3 | Asignaciones de técnicos | `src/campusops/contracts.ts`; `course-backend/campusops.mjs` | `assignedTechnicianId`, relación con el estado y eventos de `history`. | Preservar quién puede atender/consultar y evitar reasignaciones no autorizadas. |
| A4 | Notas y comentarios internos | `course-backend/campusops.mjs` | `payload.notes` con `actorId` y `text`; diagnóstico registrado al resolver. | El texto libre puede revelar detalles del caso; no debe copiarse a logs. No existe un campo móvil separado de comentarios internos. |
| A5 | Fotografías / evidencia fotográfica | `course-backend/campusops.mjs`; `course-backend/campusops-self-test.mjs` | Referencias de `payload.evidence` con `actorId` y `evidenceId`, y su asociación con la incidencia. | Impedir exposición o asociación indebida. Actualmente son metadatos sintéticos, no archivos de imagen almacenados. |
| A6 | Ubicaciones ficticias | `src/campusops/domain/Incident.ts`; `src/campusops/infrastructure/InMemoryIncidentRepository.ts`; `src/campusops/contracts.ts`; `course-backend/campusops.mjs` | Etiqueta textual `location`; coordenadas del doble de geocodificación. | Evitar divulgación en registros y alteraciones del lugar reportado; no hay seguimiento real. |
| A7 | Registros técnicos / logs | `course-backend/server.mjs`; `course-backend/self-test.mjs`; `course-backend/campusops-self-test.mjs`; `tools/course_public_evaluator.py` | stdout/stderr, diagnósticos, resultados y fragmentos guardados en reportes. | Conservar evidencia útil sin transformar los logs en una copia de datos sensibles. |
| A8 | Credenciales, tokens y configuración sensible de desarrollo | `course-backend/campusops.mjs`; `course-backend/server.mjs`; `src/api/courseBackend.ts`; `.env.example`; `.gitignore` | Evitar incorporación de secretos reales al código, configuración pública o salidas. | Los tokens existentes son didácticos y la URL pública no es secreta; una credencial real expuesta permitiría reutilización indebida. |
| A9 | Roles e identidad | `src/campusops/contracts.ts`; `course-backend/campusops.mjs` | `CampusRole`, mapa `actors`, actor reportante y técnico asignado. | Mantener separación entre reportante, técnico y coordinador; el tipo TypeScript no autentica. |
| A10 | Configuración del CI | `.github/workflows/week-03-ci-amenazas-feedback.yml`; `Makefile`; `package.json`; `package-lock.json`; `tools/course_public_evaluator.py` | Comprobaciones obligatorias, dependencias, permisos, códigos de salida y artefactos. | Evitar una aprobación aparente por omisión de controles o manipulación de la ejecución. |

## 3. Fronteras de confianza

| ID | Frontera | Componentes | Datos que cruzan | Riesgo principal | Controles actuales | Limitaciones |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Aplicación móvil → Backend | `src/api/courseBackend.ts`, `course-backend/server.mjs`, `course-backend/campusops.mjs`; clientes de `course-backend/campusops-self-test.mjs`. | La app intercambia solicitud/respuesta de `/health`. Los clientes de prueba envían actor, token sintético, ID, acciones, versión, notas, ubicación y referencias de evidencia a la API CampusOps. | Confiar en identidad o datos controlados por el cliente y revelar/modificar una incidencia ajena. | Validación parcial de respuesta de salud en la app; backend comprueba token didáctico, actor conocido, visibilidad, rol, entradas y versión. | La app no integra las operaciones completas. HTTP local y actor seleccionable por encabezado; no hay autenticación productiva. |
| F2 | Backend → Datos | Handlers y mapas `incidents`, `operations` de `course-backend/campusops.mjs`; `completedOperations` de `course-backend/server.mjs`. | Incidencias, asignación, estado, notas, evidencia, historial, versiones y resultados idempotentes. | Escrituras indebidas, sobrescritura de asignaciones o duplicación de operaciones. | En las acciones de incidencias hay validaciones de rol/transición, `baseVersion`, copias con `structuredClone` e idempotencia; un conflicto de versión se rechaza. | Frontera lógica dentro del mismo proceso: estructuras en memoria, no base de datos externa ni aislamiento por credenciales de almacenamiento. El estado se pierde al reiniciar. |
| F3 | Repositorio → GitHub Actions | `.github/workflows/week-03-ci-amenazas-feedback.yml`, `Makefile`, `package.json`, `package-lock.json`, evaluador y runner Ubuntu. | Código, dependencias, configuración y workflow pasan a ejecución en el runner; salen resultados y artefactos de evidencia. | Ejecutar cambios no confiables, desactivar checks o publicar secretos en resultados. | `contents: read`, instalación reproducible mediante `make setup` → `npm ci`, bundle, verificaciones, escaneo por patrones y carga de artefactos; no se observan mecanismos para ignorar fallos obligatorios. | Configuración local no demuestra ejecución exitosa ni protección de ramas. CI de Semana 03 no ejecuta los self-tests del backend; los detectores tienen cobertura limitada. |
| F4 | Aplicación/backend → Logs y monitoreo | Salida estándar del backend y self-tests; captura de comandos en `tools/course_public_evaluator.py`; artefactos del workflow. | stdout/stderr y sus últimos 3.000 caracteres combinados guardados por el evaluador en reportes; mensajes técnicos. | Un diagnóstico copia notas, ubicación o tokens a salidas y artefactos. | Los mensajes actuales revisados del backend anuncian escucha/resultados sin imprimir cuerpos de incidencias ni tokens. | No existe plataforma productiva de monitoreo ni sanitización general. `redactForTelemetry` en `src/course-evaluation/index.ts` sigue pendiente; el evaluador no redacta lo que captura. |

## 4. Criterio de priorización

La probabilidad se clasifica como **Baja**, **Media** o **Alta** según exposición actual, facilidad del escenario y controles presentes. El impacto es **Bajo**, **Medio** o **Alto** según el daño a confidencialidad, integridad, separación de roles y operación del sistema. Son estimaciones cualitativas de diseño, no frecuencias medidas ni porcentajes.

La prioridad se obtiene con esta referencia y se justifica en cada amenaza:

| Probabilidad / Impacto | Bajo | Medio | Alto |
| --- | --- | --- | --- |
| Baja | Baja | Baja | Media |
| Media | Baja | Media | Alta |
| Alta | Media | Alta | Alta |

Los impactos describen la propiedad de seguridad que se perdería si ocurre el escenario, sin afirmar que hoy existan datos o credenciales reales. La ausencia actual de logs de payload reduce la probabilidad de T3–T5, pero no demuestra sanitización.

Estado del control:

- **EXISTENTE:** mecanismo observado en el código/configuración para el alcance descrito; no significa que sus pruebas se hayan ejecutado aquí.
- **PARCIAL:** hay mecanismos implementados, pero límites de identidad, alcance o cobertura impiden afirmar protección completa.
- **PROPUESTO:** medida pendiente de implementación/integración; una prueba escrita para una función pendiente no la convierte en control operativo.

## 5. Amenazas priorizadas, controles y verificación

La tabla separa cada escenario y su activo afectado. V1–V4 identifican verificaciones existentes descritas después; P1–P5 son pruebas propuestas, no resultados obtenidos.

| ID | Activo afectado | Frontera | Amenaza / escenario | Probabilidad | Impacto | Prioridad | Control técnico | Estado del control | Prueba o verificación asociada | Riesgo residual |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | A1, A3, A4, A5, A6, A9 | F1 | Un técnico solicita por ID una incidencia no asignada a él y recibe contenido, notas, ubicación o evidencia. | Media: la identidad del simulador es seleccionable por el cliente. | Alto: pérdida de confidencialidad y separación de acceso. | Alta | El backend debe validar identidad, rol y asignación antes de devolver datos. `visible()` filtra listas y provoca `403` en detalles no visibles; la identidad actual solo se comprueba contra fixtures. | PARCIAL | V1: cobertura existente relacionada de autorización del backend. **Prueba propuesta P1:** GET por técnico no asignado, rechazo sin contenido. | Suplantación del actor sintético; falta la prueba específica y la integración móvil. La regla de GET no acredita todos los caminos de respuesta. |
| T2 | A1, A2, A3, A9 | F1, F2 | Un técnico o reportante intenta asignar/reasignar una incidencia para cambiar quién la atiende. | Media: hay acciones invocables e identidad didáctica controlada por el cliente. | Alto: altera integridad, permisos y operación. | Alta | `handleCampusOps` reserva `assign` a `coordinator`, valida técnico y versión antes de guardar. La misma acción realiza asignación y reasignación; no hay acción separada `reassign`. | PARCIAL | V1 cubre reasignación por coordinador y otros rechazos, no `assign` por no coordinador. **Prueba propuesta P2:** intento de técnico/reportante → `403`, recurso sin cambios. | Identidad no autenticada de forma productiva; faltan casos negativos específicos. Deben conservarse estado, versión, asignación e historial ante rechazo. |
| T3 | A4, A7 | F4 | Un error o diagnóstico imprime el cuerpo de la incidencia y expone notas/comentarios internos en logs. | Baja: los mensajes actuales revisados no imprimen ese cuerpo. | Alto: divulgaría texto restringido fuera del control de acceso a la incidencia. | Media | Sanitizar antes de registrar; omitir/redactar notas, comentarios y texto libre, conservando únicamente contexto técnico permitido. `redactForTelemetry` no está implementado. | PROPUESTO | **Prueba propuesta P3:** nota ficticia distintiva en un error, ausente de stdout/stderr y del reporte resultante. | Hasta integrar la sanitización no hay garantía transversal; nuevas claves, objetos anidados o texto libre pueden eludir filtros. |
| T4 | A6, A7 | F4 | Una ubicación textual o coordenadas terminan en logs al registrar solicitudes/respuestas de una incidencia o geocodificación. | Baja: no se observa registro actual de estos payloads. | Alto: rompe confidencialidad de ubicación y minimización de datos. | Media | Omitir/redactar `location`, etiquetas de ubicación y coordenadas antes de emitir telemetría; conservar ID sintético/código de error cuando sea suficiente. | PROPUESTO | **Prueba propuesta P4:** ubicación y coordenadas ficticias ausentes de logs capturados y reportes. | La ubicación puede aparecer dentro de mensajes o campos alternativos; no hay sanitizador integrado. |
| T5 | A8, A7 | F4 | Un error imprime token, credencial o encabezado en stdout/stderr y el evaluador conserva esa salida. | Baja: los tokens son didácticos y no se observó impresión actual de sus valores. | Alto: una credencial real permitiría reutilización y comprometería otros controles. | Media | No registrar secretos; sanitizar encabezados, errores y objetos antes de emitirlos y antes de conservar resultados. No incluir secretos en variables públicas del cliente. | PROPUESTO | **Prueba propuesta P5:** valor exclusivamente ficticio en un error/encabezado, ausente de salidas y reporte. La comprobación de `FAKE_TOKEN` de V2 no prueba sanitización. | Mensajes de dependencias o excepciones podrían conservar valores; ocultar solo una clave no cubre texto libre. |
| T6 | A8, A10 | F3 | Una API key, contraseña, token o clave privada se escribe en código/configuración y se incorpora al repositorio. | Media: una edición de desarrollo puede introducir un secreto fuera de los patrones/rutas vigilados. | Alto: exposición reutilizable que puede comprometer servicios y controles. | Alta | `.gitignore` excluye `.env` y ciertos archivos de firma; V2 y V3 buscan patrones y fallan ante coincidencias. Complementar con revisión antes de compartir y, si hubiera una exposición real, revocación/rotación. | PARCIAL | V2: detector de `course-tests/public/week-03.test.ts`. V3: `scan_secrets` del evaluador de Semana 03. Son comprobaciones existentes, no ejecutadas aquí. | Formatos no reconocidos, rutas excluidas e historial quedan fuera. `.gitignore` no protege una credencial ya versionada; un check posterior a subirla no revierte su exposición. |
| T7 | A10, A7 | F3 | Un cambio desactiva comprobaciones obligatorias o presenta éxito pese a un fallo. | Media: workflow y scripts cambian junto con el código. | Medio: degrada la confianza en CI y la detección de otros riesgos. | Media | Mantener instalación reproducible, `contents: read`, propagación de errores y artefactos; prueba estática del workflow y detección de patrones de omisión de fallos. | EXISTENTE | V4: comprobaciones textuales del workflow en la prueba pública y `workflow_integrity` del evaluador. | El análisis textual no demuestra toda la semántica del workflow; protección de ramas y checks requeridos deben verificarse en GitHub. |

**Verificaciones existentes y alcance real (no ejecutadas en esta etapa)**

| ID | Archivo / comando asociado | Qué verifica realmente | Qué no demuestra |
| --- | --- | --- | --- |
| V1 | `course-backend/self-test.mjs` llama a `course-backend/campusops-self-test.mjs`; `npm run backend:self-test`. | Actor desconocido, acceso denegado a reportante ajeno, cierre prohibido a reportante, reasignación por coordinador, inicio rechazado al técnico anterior, versión obsoleta e idempotencia. | No contiene GET directo de técnico no asignado ni intento de `assign` por no coordinador; no acredita autenticación productiva ni sanitización. |
| V2 | `course-tests/public/week-03.test.ts`; `npm test -- --ci --runInBand course-tests/public/week-03.test.ts`. | Busca determinados patrones de credenciales en `App.tsx`, `index.ts`, `src` y `course-backend`, para extensiones `.cjs`, `.js`, `.mjs`, `.ts`, `.tsx`. También falla si `FAKE_TOKEN` tiene valor. | No revisa todas las rutas, formatos ni historial. La presencia de `FAKE_TOKEN` es un disparador de entorno, no una prueba de filtración en logs ni del reconocimiento de una credencial en un archivo. |
| V3 | `tools/course_public_evaluator.py`, función `scan_secrets`; invocada por `make verify-week-03` y `make public-test-week-03`. | Recorre archivos del directorio y busca patrones de ciertas claves privadas, tokens GitHub, claves AWS y nombres públicos de configuración sensible. | No se limita a archivos rastreados por Git ni analiza historial. Excluye `.git`, dependencias, varios directorios generados, `.env.example` y ciertos formatos binarios; no detecta todo secreto. |
| V4 | `course-tests/public/week-03.test.ts` y `tools/course_public_evaluator.py`. Comandos de V2/V3. | La prueba revisa instalación directa/delegada, Node 22, una referencia a tipos/verificación, permiso mínimo y ausencia de patrones para ignorar fallos. El evaluador también comprueba integridad textual de workflows. | No ejecuta por sí sola el workflow remoto ni demuestra protección de ramas. La prueba del modelo solo exige las palabras activo, amenaza, control y verificación; no valida la calidad completa del análisis. |

`npm run audit:ci` ejecuta una auditoría de vulnerabilidades de dependencias con umbral crítico y omisión de dependencias de desarrollo; **npm audit no es secret scanning**. `src/campusops/_tests_/incidentQueries.test.ts` y `src/campusops/_tests_/incidentNavigation.test.tsx` comprueban consultas y navegación, **no autorización**.

Los tests de `course-tests/public/week-04.test.ts` y `course-tests/public/week-10.test.ts` expresan expectativas de redacción de datos/token, pero llaman a `redactForTelemetry`, que sigue pendiente. Su existencia no acredita un flujo de logs sanitizado. Los comandos Make anteriores generan reportes; se enumeran como referencias para una ejecución posterior, no como acciones realizadas al redactar este modelo.

**Pruebas propuestas (sin implementación ni resultado declarado)**

| ID | Amenaza | Escenario de verificación | Resultado esperado |
| --- | --- | --- | --- |
| P1 | T1 | Prueba propuesta: con fixtures restablecidos y sin suplantar otro actor, un técnico conocido pero no asignado solicita `GET /v1/incidents/:id` de una incidencia existente. | `403`; respuesta sin payload, notas, ubicación ni referencias de evidencia. Comprobar que la lista tampoco incluya esa incidencia. |
| P2 | T2 | Prueba propuesta: técnico y reportante intentan `assign` sobre casos nuevos y ya asignados, usando versión vigente, técnico destino válido y clave de idempotencia nueva. Comparar el recurso antes/después mediante un actor autorizado. | `403`; ID, payload, asignación, estado, versión e historial sin cambios. Los datos válidos evitan confundir un rechazo de contrato con autorización. |
| P3 | T3 | Prueba propuesta: introducir una nota/comentario exclusivamente ficticio con texto distintivo, provocar un error controlado y capturar el futuro flujo de registro sanitizado. | El texto no aparece en stdout/stderr ni en el reporte que conserve esa salida; permanece contexto técnico útil. |
| P4 | T4 | Prueba propuesta: enviar etiqueta y coordenadas ficticias a un diagnóstico controlado y observar el futuro flujo de registro sanitizado. | No aparecen ubicación ni coordenadas en logs/reportes; no se suprime todo el diagnóstico para aparentar protección. |
| P5 | T5 | Prueba propuesta: usar exclusivamente un marcador ficticio como valor de token/encabezado y dentro de un error; capturar la salida y el reporte del futuro flujo sanitizado. | El valor no aparece en stdout/stderr ni reportes; se conserva código de error o correlación sin credenciales. |

P3–P5 requieren implementar e integrar el control de redacción antes de acreditar su eficacia. Una salida vacía o una función que nunca se invoca no demostraría que el control protege el flujo real.

## 6. Decisión de seguridad

Se priorizan principalmente **T1, acceso a incidencias ajenas**, y **T2, modificación no autorizada de asignaciones**, porque afectan directamente confidencialidad, integridad, separación de roles y operación: una persona podría conocer un caso ajeno o cambiar quién debe atenderlo. **T6** también tiene prioridad Alta: una credencial real expuesta podría permitir eludir otros controles, por lo que su prevención debe mantenerse en paralelo.

Ocultar botones en la interfaz **no constituye autorización**. La autorización debe ejecutarse en el backend antes de devolver contenido o aplicar una operación, utilizando una identidad confiable y comprobando rol, asignación y transición. Los casos de uso móviles pueden reforzar la experiencia, pero no sustituyen esa autoridad. Una operación rechazada no debe modificar el recurso.

El simulador ya contiene reglas útiles de visibilidad, roles, versiones e idempotencia. La decisión no las presenta como autenticación productiva ni atribuye autorización a las pruebas de navegación. Se propone completar la verificación específica con P1/P2 y mantener separados los escenarios de privacidad P3–P5.

Centralizar reglas en el backend permite que distintos clientes reciban la misma decisión de acceso. El costo es mantener reglas y pruebas negativas por operación, verificar identidad al integrar sesión real y revisar respuestas repetidas tras cambios de asignación. Conservar versiones, historial y rechazo de conflictos evita sobrescrituras silenciosas; persistencia y resolución offline requieren trabajo posterior. CI aporta verificaciones y evidencia, pero sus resultados no sustituyen la comprobación del control concreto.

## 7. Riesgos y limitaciones actuales

- Las identidades son sintéticas y los tokens actuales son didácticos. `X-Course-Actor` selecciona un actor conocido; no existe vinculación productiva entre una sesión autenticada y ese actor. El simulador no debe tratarse como servicio institucional.
- La app móvil todavía no integra todas las operaciones; sus consultas en memoria no filtran por usuario. Declarar `CampusRole` no implementa permisos.
- El almacenamiento es en memoria y no hay base de datos externa, recuperación persistente ni cola offline implementada. El historial registra operación, actor, acción y versión, pero no todos los valores anteriores/nuevos de una asignación.
- Las fotografías son referencias sintéticas; no se acredita protección de archivos de imagen, captura ni carga real.
- No hay monitoreo productivo y la sanitización completa de telemetría sigue pendiente. Que hoy no se impriman payloads sensibles no garantiza que futuros errores o dependencias no los impriman.
- Algunas pruebas son propuestas. CI de Semana 03 no ejecuta `backend:self-test`; tampoco las pruebas de consultas/navegación sustituyen los casos de autorización.
- El escaneo de secretos no garantiza detectar todos los secretos ni cubre historial completo. `.gitignore` no elimina secretos ya versionados y no excluye todas las variantes de archivos de entorno. Una exposición real requeriría revocación/rotación, no solo borrar el texto.
- Por inspección de `course-backend/campusops.mjs`, una repetición idempotente devuelve una respuesta guardada antes de repetir la autorización de la acción. Queda por verificar el acceso a esa respuesta tras una reasignación; no se declara una prueba ejecutada ni protección completa de ese camino.
- La ruta heredada `/v1/resources/action` en `course-backend/server.mjs` no aplica las reglas de roles de incidencias. No debe generalizarse la protección de `/v1/incidents` a todo endpoint.
- La configuración local de CI no demuestra reglas de protección de ramas, obligatoriedad de checks ni ejecución remota exitosa; esos aspectos requieren verificación posterior.

Estos puntos delimitan el alcance actual y el riesgo residual. Las funciones previstas para semanas posteriores no se presentan, por su sola ausencia, como fallos de la entrega de Semana 03. No se afirma que ninguna verificación haya aprobado durante esta revisión documental.

## 8. Uso de asistencia

Se utilizó asistencia de IA para organizar el modelo, revisar consistencia, relacionar amenazas con componentes reales y distinguir controles existentes, parciales y propuestos. El contraste manual del contenido se realizó mediante lectura de los archivos reales citados, las pruebas, el workflow, `docs/CAMPUSOPS.md` y `docs/CAMPUSOPS_API.md`; no mediante la suposición de funcionalidades futuras ni resultados de ejecución.

Esta revisión documental asistida no sustituye la revisión final del integrante responsable, quien debe comprender y corroborar cada afirmación antes de entregar. No se ejecutaron pruebas en esta etapa, no se declaran resultados nuevos y las pruebas propuestas no se presentan como implementadas.
