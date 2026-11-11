# tarea por hacer esta semana #


este archivo solo es para tratar las instrucciones y los criterios de aceptacion de la actividad por semana existira un directorio donde se encuentren todas las actividades  por semana por un check in completo pero este solo sera de esta semana.

Tu trabajo sera dividir la tarea entre 3 personas para poder entregar todo completo para la respectiva semana y devolver las asignaciones a cada persona por el chat , las actividades no tienen que depender de otras para que no existan conflictos a la hora de juntar todo.

Esta es la actividad de esta semana los archivos comprimidos ya se encuentran en el proyecto tienes aun mas contexto en agent/activity/ACTIVITY_STUDENT_FACING.md
 , agent/activity/RUBRIC_PUBLIC.MD , agent/activity/CAMPUSOPS_API.MD y agent/activity/CAMPUSOPS.MD  :

# Semana 11 — Pruebas debug/release y diagnóstico de defectos (8 puntos)

Una función puede pasar sus pruebas durante el desarrollo y fallar al preparar la versión de distribución. Esta semana investigarán una regresión de CampusOps y demostrarán que la corrección resuelve la causa, no sólo mejora un porcentaje de cobertura.

Trabajen en su **equipo de 3**, sobre el mismo repositorio de CampusOps con **React Native, Expo y TypeScript**. Descarguen el ZIP `week-11-pruebas-diagnostico.zip`; no reinicien el proyecto ni borren el trabajo anterior.

## ¿Qué deben hacer?

1. **Elijan y reproduzcan el defecto.** Usen un problema reproducible de consulta, atención, sincronización o ubicación que permita contrastar debug y release. Registren condiciones, comando, resultado observado y causa; no se limiten a describir que algo falla.
2. **Escriban una prueba de regresión.** Construyan una prueba que exponga el defecto y explique por qué detecta su causa. Corrijan el código y conserven resultados antes y después. No ignoren el test ni desactiven optimizaciones sólo para ocultar el problema.
3. **Comprueben las variantes.** Ejecuten la suite declarada en debug y release y documenten un comportamiento equivalente. La generación del paquete release no sustituye la comprobación funcional de esas variantes.
4. **Interpreten la cobertura por riesgo.** Ejecuten npm run test:coverage:week11 y npm run bundle:release. El umbral publicado es 60% de ramas, 65% de funciones, 70% de líneas y 70% de sentencias en el alcance configurado. Cumplirlo no demuestra por sí solo que el flujo funciona: expliquen qué riesgos cubren las pruebas.

## ¿Qué entregan?

En el repositorio deben quedar el código, las pruebas y estos documentos/reportes:

- `docs/test-strategy.md`: Estrategia de pruebas acumulativas, variantes y justificación de cobertura por riesgo.
- `reports/week-11/debug-release.json`: Evidencias de ambas variantes; incluir variants con debug y release, además del formato común de reportes.
- `reports/week-11/defect-trace.json`: Causa, corrección y prueba de regresión en rootCause, correction y regressionTest, además del formato común y resultados antes/después.

Incluyan también la justificación técnica del equipo y la evidencia de sus tres integrantes en `engineering.json` e `individual.json`, dentro de `evidence/week-11/`.

En esta tarea entreguen **enlace del repositorio, etiqueta `week-11-final` y SHA completo**. La etiqueta señala la versión final y el SHA es su identificador único. `ACTIVITY_STUDENT_FACING.md` explica los pasos y `STARTER_AND_REPOSITORY.md` contiene los comandos y el formato de evidencias.

## ¿Cómo se califica?

Reproducción: **2.5**; funcionamiento requerido: **2**; manejo de la falla: **1.5**; decisión justificada: **1.5**; aportación individual: **0.5**. Total: **8 puntos**. Consulten `RUBRIC_PUBLIC.md` para los niveles de desempeño y límites de calificación. Usen datos ficticios y conserven las pruebas sin desactivarlas.

La calificación se obtiene a partir de evidencia: AC-01 a AC-03 son comprobaciones automáticas (6 puntos) y AC-04/AC-05 son comprobaciones semiautomáticas (2 puntos). El nivel parcial no tiene un porcentaje prefijado: se asigna según la evidencia descrita en la rúbrica. Un flag sólo solicita corroboración y no descuenta por sí mismo.

**Entrega: 16 de noviembre de 2026, a las 23:59, hora de Ciudad de México.**

Por separado, cada integrante responde **Quiz semanal 11 — Testing y diagnóstico**: **3 preguntas, 3 puntos**, que no forman parte de los 8 de esta actividad.



Actividad individual por revision de skill revision-aporte-individual-skill.md : 

Integrante 1: Martín (3523110349)

Foco: Reproducción del defecto, prueba de regresión automatizada y corrección del código (Root Cause & Fix).

Responsabilidades técnicas:
Reproducción del defecto: Identificar y aislar una regresión reproducible en el flujo de incidencias de CampusOps (por ejemplo: fallo de serialización/deserialización o pérdida de propiedades en release ante minificación/optimizaciones del bundler).
Prueba de regresión: Escribir una prueba unitaria automatizada (src/campusops/_tests_/RegressionDefectRelease.test.ts) que falle antes de la corrección y demuestre inequívocamente la causa raíz del defecto.
Corrección en código: Aplicar la corrección precisa en el código fuente de CampusOps asegurando que el flujo funcione tanto en debug como en release sin deshabilitar optimizaciones.
Reporte de trazabilidad: Elaborar reports/week-11/defect-trace.json incluyendo los campos exigidos por contrato (rootCause, correction, regressionTest, y los resultados observables antes/después).
Evidencia individual: Registrar su ficha en evidence/week-11/individual.json.
Archivos asignados:
Código fuente corregido en src/campusops/
src/campusops/_tests_/RegressionDefectRelease.test.ts
reports/week-11/defect-trace.json
evidence/week-11/individual.json (ficha de Martín)