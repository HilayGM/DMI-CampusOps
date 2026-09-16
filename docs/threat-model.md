# Modelo inicial de amenazas — Semana 03

## Alcance y activos

CampusOps usa únicamente información ficticia. Los **activos** que se deben proteger son las incidencias, su historial de asignaciones y estados, las notas y evidencias adjuntas, los identificadores de sesión y la configuración de CI. Una exposición permitiría consultar incidencias ajenas, alterar una asignación o reutilizar una credencial.

## Fronteras de confianza

1. La persona usuaria y la aplicación móvil: la entrada de una incidencia no es confiable hasta que el caso de uso la valida.
2. La interfaz y los casos de uso: ocultar una acción en pantalla no autoriza una transición; la autorización debe aplicarse en el servicio.
3. Los casos de uso y el repositorio/adaptador: sólo se intercambian datos mínimos y sintéticos; no se registran sesiones, ubicaciones precisas ni notas internas.
4. El repositorio y GitHub Actions: el workflow recibe cambios de ramas y sólo dispone del permiso `contents: read`.

## Amenazas priorizadas, controles y verificación

| Prioridad | Amenaza | Control | Verificación reproducible | Riesgo residual |
| --- | --- | --- | --- | --- |
| Alta | Un técnico consulta o modifica una incidencia reasignada a otra persona. | Autorizar la transición en el caso de uso con el identificador del técnico asignado; la UI no es la autoridad. | Prueba de navegación y consultas con `npm.cmd test -- --ci --runInBand src/campusops/_tests_/incidentQueries.test.ts src/campusops/_tests_/incidentNavigation.test.tsx`. | La autenticación remota aún no existe; al integrar backend se validará el sujeto de la sesión en el servidor. |
| Alta | Se altera una asignación sin conservar el estado ni informar un conflicto. | Validar transiciones permitidas y conservar el historial; rechazar conflictos en vez de sobrescribirlos. | `npm.cmd test -- --ci --runInBand src/campusops/_tests_/incidentQueries.test.ts` debe rechazar rutas o estados no permitidos cuando se agregue la operación de reasignación. | La concurrencia real se implementará con el adaptador remoto y versionado de la incidencia. |
| Media | Registros o artefactos publican datos internos, tokens o credenciales. | Usar sólo datos sintéticos, no registrar secretos y escanear el árbol en la verificación. | `npm.cmd run audit:ci` y `npm.cmd test -- --ci --runInBand course-tests/public/week-03.test.ts`; el evaluador también detecta patrones de claves en archivos rastreables. | El escaneo por patrones no sustituye la revocación ni la gestión de secretos de producción. |
| Media | Un cambio desactiva una comprobación obligatoria de CI. | Workflow con mínimo privilegio y sin `continue-on-error`, `|| true` ni `--passWithNoTests`; conserva evidencias como artefacto. | `npm.cmd test -- --ci --runInBand course-tests/public/week-03.test.ts` falla si se elimina la instalación reproducible, el permiso mínimo o se oculta un error. | Las reglas de protección de ramas se deben configurar en GitHub antes de producción. |

## Decisión

Se atiende primero la autorización de acceso y modificación de incidencias: una consulta o reasignación indebida afecta confidencialidad e integridad incluso si la interfaz aparenta restringirla. El control se coloca en los casos de uso y se verifica por pruebas ejecutables; el workflow evita que esas pruebas o el escaneo de secretos queden desactivados al integrar cambios.

## Uso de asistencia

Se utilizó asistencia de IA para ordenar el modelo y redactar esta primera versión. El integrante responsable debe revisar cada afirmación frente a `docs/CAMPUSOPS.md`, el código y las pruebas antes de integrar la entrega.
