# tarea por hacer esta semana #


este archivo solo es para tratar las instrucciones y los criterios de aceptacion de la actividad por semana existira un directorio donde se encuentren todas las actividades  por semana por un check in completo pero este solo sera de esta semana.

Tu trabajo sera dividir la tarea entre 3 personas para poder entregar todo completo para la respectiva semana y devolver las asignaciones a cada persona por el chat 

Esta es la actividad de esta semana los archivos comprimidos ya se encuentran en el proyecto tienes aun mas contexto en agent/activity/ACTIVITY_STUDENT_FACING.md
 , agent/activity/RUBRIC_PUBLIC.MD , agent/activity/CAMPUSOPS_API.MD y agent/activity/CAMPUSOPS.MD  :


# Semana 09 — Integración resiliente con API de terceros (8 puntos)

El servicio de ubicación puede fallar y una respuesta de cierre puede perderse después de que el servidor ya guardó el cambio. Esta semana harán que CampusOps siga siendo útil y reintente sólo cuando sea seguro.

Trabajen en su **equipo de 3**, sobre el mismo repositorio de CampusOps con **React Native, Expo y TypeScript**. Descarguen el ZIP `week-09-integracion-resiliente.zip`; no reinicien el proyecto ni borren el trabajo anterior.

## ¿Qué deben hacer?

1. **Integren el servicio de ubicación.** Integren mapas o geocodificación mediante un adaptador y caché. Documenten proveedor y restricciones, y conserven evidencia de una ejecución real con datos ficticios. Para reproducir fallos usen el doble controlado, sin depender de cuotas o disponibilidad externa.
2. **Conserven una alternativa manual.** Implementen selectIncidentLocation según docs/CAMPUSOPS_API.md. Verifiquen éxito, datos incompletos o inválidos, timeout, 429 y desconexión. Si el proveedor no sirve, la app debe permitir escribir edificio, zona o referencia; no inventen coordenadas.
3. **Limiten los reintentos.** Implementen planRetry respetando Retry-After, esperas progresivas y límites publicados: no se reintenta desde el intento 4. Las demoras deben ser finitas y los límites configurables y comprobables. Un POST no se repite sin identidad estable de operación.
4. **Reproduzcan una respuesta perdida.** Prueben una resolución o cierre que el servidor procesa aunque la respuesta no llegue. Al reintentar, conserven la misma clave y contenido; no deben duplicarse eventos, evidencias o notificaciones. Registren intentos y tiempos sanitizados y expliquen cuándo reintentar, usar la alternativa o informar un fallo.

## ¿Qué entregan?

En el repositorio deben quedar el código, las pruebas y estos documentos/reportes:

- `docs/resilience-policy.md`: Proveedor y ejecución externa, caché, ubicación manual y reglas de reintento o fallo.
- `reports/week-09/fault-injection.json`: Evidencia de fallos reproducidos y respuesta de CampusOps, incluida la respuesta perdida tras guardar.
- `reports/week-09/retry-metrics.json`: Intentos y tiempos observados que demuestran límites y ausencia de duplicados.

Incluyan también la justificación técnica del equipo y la evidencia de sus tres integrantes en `engineering.json` e `individual.json`, dentro de `evidence/week-09/`.

En esta tarea entreguen **enlace del repositorio, etiqueta `week-09-final` y SHA completo**. La etiqueta señala la versión final y el SHA es su identificador único. `ACTIVITY_STUDENT_FACING.md` explica los pasos y `STARTER_AND_REPOSITORY.md` contiene los comandos y el formato de evidencias.

## ¿Cómo se califica?

Reproducción: **2.5**; funcionamiento requerido: **2**; manejo de la falla: **1.5**; decisión justificada: **1.5**; aportación individual: **0.5**. Total: **8 puntos**. Consulten `RUBRIC_PUBLIC.md` para los niveles de desempeño y límites de calificación. Usen datos ficticios y conserven las pruebas sin desactivarlas.

La calificación se obtiene a partir de evidencia: AC-01 a AC-03 son comprobaciones automáticas (6 puntos) y AC-04/AC-05 son comprobaciones semiautomáticas (2 puntos). El nivel parcial no tiene un porcentaje prefijado: se asigna según la evidencia descrita en la rúbrica. Un flag sólo solicita corroboración y no descuenta por sí mismo.

**Entrega: 2 de noviembre de 2026, a las 23:59, hora de Ciudad de México.**

Por separado, cada integrante responde **Quiz semanal 9 — Resiliencia de API**: **3 preguntas, 3 puntos**, que no forman parte de los 8 de esta actividad.






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
