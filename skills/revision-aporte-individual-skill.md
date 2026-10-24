---
name: dmi-revision-individual
description: Revisa la contribución individual a una entrega DMI contra el alcance asignado, los criterios AC y RUBRIC_PUBLIC.md, con evidencia verificable.
---

# Revisión individual de actividades DMI

Usa esta guía cuando una persona quiera revisar su parte de una actividad o proyecto DMI antes de entregarla o integrarla con el equipo. Evalúa únicamente el alcance asignado y la evidencia atribuible a esa persona. No le atribuyas fallas de otras partes del proyecto sin evidencia directa.

## Datos para iniciar la revisión

Solicita los datos que falten antes de evaluar. Pide únicamente la información necesaria que aún no se haya proporcionado.

```text
Matrícula del integrante: [escribe tu matrícula]
Integrante: [número y total de integrantes]

Parte asignada (consigna, historia de usuario, módulos, archivos o criterios de aceptación):
[pega aquí la asignación]

Evidencia disponible:
- Ruta o enlace del repositorio:
- Archivos o cambios atribuibles:
- Comandos de prueba/build ejecutados y resultado:
- Capturas, PR o commits relacionados:
```

No expongas la matrícula en registros públicos, capturas ni archivos de código. Úsala solo para identificar la revisión y muéstrala parcialmente en el resultado si es necesario, por ejemplo `A01***89`.

## Fuentes y reglas DMI

- Lee `activity.md` donde esta la parte de evaluacion individual y la consigna del proyecto antes de emitir conclusiones. Aplica los niveles de desempeño y límites que indiquen esos documentos.
- Identifica qué criterios de aceptación AC-01 a AC-05 corresponden a la parte asignada. AC-01 a AC-03 son comprobaciones automáticas y AC-04/AC-05 semiautomáticas; confirma su definición en los archivos del proyecto y no supongas contenidos ni asignaciones que no estén documentados.
- Usa datos ficticios durante las verificaciones. No incorpores datos personales o reales a pruebas, ejemplos, capturas o reportes.
- Conserva las pruebas y su configuración habilitada. No elimines, desactives, omitas ni debilites pruebas para mejorar el resultado.
- Un flag solo solicita corroboración. No lo trates como una falla ni apliques una deducción por su presencia; busca evidencia adicional y registra si queda confirmado, descartado o sin resolver.
- Distingue entre evidencia observada, inferencias y aspectos que no pudieron verificarse. La falta de pruebas es falta de evidencia, no prueba automática de que la funcionalidad falla.
- Si la revisión es solo de una contribución individual, no asignes la calificación global de 8 puntos al proyecto ni acredites a la persona resultados que dependen de otras partes. La aportación individual vale hasta 0.5 puntos en la rúbrica global; aplica ese puntaje únicamente si la evaluación solicitada pide explícitamente calificar el proyecto completo y existe evidencia atribuible suficiente. En los demás casos, informa el estado de la contribución sin convertirlo en una nota global.

## Método de revisión

1. **Delimita el alcance.** Convierte la asignación en criterios verificables y separa comportamiento, artefactos, pruebas, integración y documentación que correspondan a esa parte.
2. **Relaciona alcance y evidencia.** Inspecciona los archivos y cambios relevantes; vincula cada hallazgo con un criterio asignado y una referencia concreta. Si la atribución individual no se puede establecer, indícalo como no verificable.
3. **Comprueba integración.** Revisa contratos, tipos, rutas, configuración y convenciones del proyecto que afecten la contribución. Señala efectos en otros módulos solo cuando haya evidencia.
4. **Ejecuta verificaciones pertinentes.** Sigue las instrucciones del proyecto para ejecutar pruebas, lint, typecheck o build existentes que cubran el alcance. Registra los comandos y resultados. No modifiques código ni configuración como parte de una revisión, salvo que la persona también haya pedido una corrección.
5. **Corrobora flags y fallas.** Busca evidencia adicional para cualquier señal o flag. Registra lo que se observó y lo que permanece incierto; el flag no resta puntos por sí solo.
6. **Emite hallazgos accionables.** Prioriza por impacto y propone el cambio mínimo para resolver cada problema confirmado.

## Criterios de calidad

Evalúa según la asignación y aplica estos criterios solo cuando sean pertinentes:

- **Completitud:** cumple los criterios de aceptación y artefactos asignados sin depender de pasos manuales ocultos.
- **Claridad y orden:** nombres comprensibles, archivos en lugares previsibles, responsabilidades claras y cambios acotados al alcance.
- **Mantenibilidad:** evita duplicación importante, valores mágicos sin justificación y acoplamiento innecesario.
- **Integración:** respeta contratos, tipos, rutas, configuración y convenciones del proyecto; no rompe flujos compartidos.
- **Robustez:** valida entradas relevantes y trata los estados de error, carga, vacío o límite que afectan al comportamiento asignado.
- **Pruebas:** las pruebas existentes cubren resultados observables relevantes y se ejecutan correctamente. No exijas cobertura universal si no está en la asignación o rúbrica.
- **Documentación y entrega:** actualiza las instrucciones, decisiones o artefactos que exige la asignación y facilita que otra persona reproduzca o continúe el trabajo.
- **Atribución individual:** la evidencia disponible permite relacionar la contribución con la persona revisada, según los medios admitidos por la consigna y `RUBRIC_PUBLIC.md`.

No penalices decisiones de estilo que sean consistentes con el proyecto. No otorgues crédito por trabajo que solo se declara, pero no puede vincularse con evidencia. Cuando un aspecto no forma parte de la asignación, márcalo como fuera de alcance en vez de penalizarlo.

## Prioridad de hallazgos

- **Bloqueante:** impide integrar, ejecutar o cumplir un criterio obligatorio de la parte asignada.
- **Importante:** afecta de forma significativa el comportamiento, la robustez o la integración, aunque exista una alternativa temporal.
- **Mejora recomendada:** eleva claridad o mantenibilidad, pero no impide cumplir el requisito.
- **Observación:** dato contextual, limitación o aspecto que conviene tener presente sin que constituya un defecto confirmado.

## Formato del resultado

```markdown
# Revisión individual DMI — Integrante [n] de [total]

Matrícula: [enmascarada]
Estado general: Aprobado / Aprobado con ajustes / Pendiente / No verificable
Alcance revisado: [resumen breve]

## Resumen
[Dos o tres frases sobre el cumplimiento de la parte asignada y la evidencia disponible.]

## Matriz de la asignación
| Criterio asignado o AC | Evidencia revisada | Estado | Motivo |
|---|---|---|---|
| ... | archivo, prueba o comando | Cumple / Parcial / No verificable / No cumple / Fuera de alcance | explicación concreta |

## Hallazgos
- **[Bloqueante / Importante / Mejora recomendada / Observación]:** [qué ocurre, dónde, por qué importa y cambio mínimo recomendado].

## Verificaciones ejecutadas
- `[comando]` — correcto / falló / no disponible; [resultado relevante].

## Flags y corroboración
[Flag revisado, evidencia adicional y estado: confirmado, descartado o sin resolver. Aclara que el flag no produce una deducción automática. Si no hubo flags, indícalo.]

## Siguiente paso recomendado
[La acción concreta más pequeña que aumente la confianza o permita completar la entrega.]
```

Incluye rutas, secciones y resultados concretos cuando existan. Para cada estado “Parcial” o “No cumple”, explica el motivo con evidencia y delimita una corrección. Para “No verificable”, especifica qué archivo, acceso, comando o dato permitiría confirmarlo. No uses porcentajes prefijados para describir cumplimiento parcial; aplica la rúbrica del proyecto cuando se soliciten puntos.

## Condición de cierre

Considera lista la contribución cuando cada criterio obligatorio asignado tenga evidencia suficiente, las verificaciones pertinentes se hayan ejecutado correctamente y no queden hallazgos bloqueantes. Si falta evidencia o una verificación no se puede ejecutar, informa “Pendiente” o “No verificable” y explica qué se necesita para resolverlo. No simules certeza ni declares aprobadas comprobaciones no realizadas.
