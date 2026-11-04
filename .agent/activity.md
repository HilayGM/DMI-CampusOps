# tarea por hacer esta semana #


este archivo solo es para tratar las instrucciones y los criterios de aceptacion de la actividad por semana existira un directorio donde se encuentren todas las actividades  por semana por un check in completo pero este solo sera de esta semana.

Tu trabajo sera dividir la tarea entre 3 personas para poder entregar todo completo para la respectiva semana y devolver las asignaciones a cada persona por el chat , las actividades no tienen que depender de otras para que no existan conflictos a la hora de juntar todo.

Esta es la actividad de esta semana los archivos comprimidos ya se encuentran en el proyecto tienes aun mas contexto en agent/activity/ACTIVITY_STUDENT_FACING.md
 , agent/activity/RUBRIC_PUBLIC.MD , agent/activity/CAMPUSOPS_API.MD y agent/activity/CAMPUSOPS.MD  :

# Semana 10 — Estados de interfaz y observabilidad segura (8 puntos)

Cambiar de incidencia mientras llegan respuestas atrasadas no debe mostrar información de la selección anterior. Esta semana harán que la interfaz de CampusOps represente lo que realmente está ocurriendo y ayude a recuperarse de los errores.

Trabajen en su **equipo de 3**, sobre el mismo repositorio de CampusOps con **React Native, Expo y TypeScript**. Descarguen el ZIP `week-10-estados-observabilidad.zip`; no reinicien el proyecto ni borren el trabajo anterior.

## ¿Qué deben hacer?

1. **Definan los estados de la interfaz.** Representen carga, éxito, vacío, error y cancelación, además de desconexión, cambios pendientes y conflictos. Dibujen las transiciones y qué acción puede realizar el usuario en cada estado.
2. **Apliquen los estados a consulta y atención.** Implementen navegación coherente, mensajes y etiquetas accesibles, reintento controlado y recuperación. La app no debe mostrar una espera permanente cuando ya conoce el resultado o no tiene conexión.
3. **Prueben respuestas fuera de orden.** Conecten reduceRemoteResponses con la lógica real. Reproduzcan una respuesta antigua que llega después de cambiar la selección: no debe reemplazar la incidencia activa ni producir un estado imposible.
4. **Registren sólo contexto seguro.** Usen identificadores sintéticos de correlación para relacionar un error con su solicitud. Prueben la sanitización: no registren tokens, nombres, ubicación, fotografías o comentarios internos. Documenten qué señal permite diagnosticar sin exponer esos datos.

## ¿Qué entregan?

En el repositorio deben quedar el código, las pruebas y estos documentos/reportes:

- `docs/ui-state-machine.mmd`: Diagrama de estados y transiciones de la interfaz en Mermaid.
- `reports/week-10/ui-tests.json`: Pruebas de estados, navegación, accesibilidad y respuestas obsoletas.
- `reports/week-10/log-sanitization.json`: Comprobaciones del contexto técnico registrado y de la exclusión de datos sensibles.

Incluyan también la justificación técnica del equipo y la evidencia de sus tres integrantes en `engineering.json` e `individual.json`, dentro de `evidence/week-10/`.

En esta tarea entreguen **enlace del repositorio, etiqueta `week-10-final` y SHA completo**. La etiqueta señala la versión final y el SHA es su identificador único. `ACTIVITY_STUDENT_FACING.md` explica los pasos y `STARTER_AND_REPOSITORY.md` contiene los comandos y el formato de evidencias.

## ¿Cómo se califica?

Reproducción: **2.5**; funcionamiento requerido: **2**; manejo de la falla: **1.5**; decisión justificada: **1.5**; aportación individual: **0.5**. Total: **8 puntos**. Consulten `RUBRIC_PUBLIC.md` para los niveles de desempeño y límites de calificación. Usen datos ficticios y conserven las pruebas sin desactivarlas.

La calificación se obtiene a partir de evidencia: AC-01 a AC-03 son comprobaciones automáticas (6 puntos) y AC-04/AC-05 son comprobaciones semiautomáticas (2 puntos). El nivel parcial no tiene un porcentaje prefijado: se asigna según la evidencia descrita en la rúbrica. Un flag sólo solicita corroboración y no descuenta por sí mismo.

**Entrega: 9 de noviembre de 2026, a las 23:59, hora de Ciudad de México.**

Por separado, cada integrante responde **Quiz semanal 10 — Estados y observabilidad**: **3 preguntas, 3 puntos**, que no forman parte de los 8 de esta actividad.





Actividad individual por revision de skill revision-aporte-individual-skill.md : 

Integrante 1: Martín (3523110349)
Foco: Ubicación resiliente, alternativa manual y caché de proveedor.

Responsabilidades técnicas:
Implementar la función adaptadora selectIncidentLocation(providerResult, manualFallbackLabel) según CAMPUSOPS_API.md:
Validar resultado del proveedor: objeto con label no vacío y coordenadas numéricas finitas en rangos latitude: [-90, 90] y longitude: [-180, 180].
Retornar { source: 'provider', label, latitude, longitude } si es válido.
Retornar { source: 'manual', label: manualFallbackLabel } ante null, status 429, timeout, coordenadas fuera de rango o datos incompletos (sin inventar coordenadas).
Implementar caché local de geocodificación para evitar saturar cuotas externas.
Pruebas unitarias de ubicación (casos nominales, boundary con límites de latitud/longitud, y fallas de proveedor).
Entregables:
Código de selectIncidentLocation y caché en el proyecto.
Pruebas unitarias de geocodificación/fallback.
Redacción de la sección de proveedor externo y caché en 

docs/resilience-policy.md
.
Registro individual en evidence/week-09/individual.json.
