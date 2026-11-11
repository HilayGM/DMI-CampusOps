# Semana 11 — Encontrar una regresión y comprobar la corrección

**Actividad:** Pruebas debug/release y diagnóstico de defectos. **Valor:** 8 puntos. **Equipo:** 3 integrantes.

Disponible del **10 de noviembre de 2026 a las 08:00** al **16 de noviembre de 2026 a las 23:59**, hora de Ciudad de México.

## El resultado que buscamos

Una función puede pasar sus pruebas durante el desarrollo y fallar al preparar la versión de distribución. Esta semana investigarán una regresión de CampusOps y demostrarán que la corrección resuelve la causa, no sólo mejora un porcentaje de cobertura.

## Antes de empezar

Conserven las pruebas de arquitectura, seguridad, sesión, datos, sincronización y resiliencia. La estrategia de esta semana es acumulativa y se aplica al flujo real de incidencias.

Usen el mismo repositorio y stack: **React Native + Expo + TypeScript**. Instalen el ZIP `week-11-pruebas-diagnostico.zip` siguiendo `STARTER_AND_REPOSITORY.md`. Lean el alcance en `docs/CAMPUSOPS.md` y el contrato público en `docs/CAMPUSOPS_API.md`. Mantengan las funciones y controles acumulados: avanzar de semana no permite desactivar lo anterior. Si una dificultad previa les impide continuar, repórtenla al docente con evidencia del problema para recibir apoyo.

## ¿Qué deben hacer?

### 1. Elijan y reproduzcan el defecto

Usen un problema reproducible de consulta, atención, sincronización o ubicación que permita contrastar debug y release. Registren condiciones, comando, resultado observado y causa; no se limiten a describir que algo falla.

### 2. Escriban una prueba de regresión

Construyan una prueba que exponga el defecto y explique por qué detecta su causa. Corrijan el código y conserven resultados antes y después. No ignoren el test ni desactiven optimizaciones sólo para ocultar el problema.

### 3. Comprueben las variantes

Ejecuten la suite declarada en debug y release y documenten un comportamiento equivalente. La generación del paquete release no sustituye la comprobación funcional de esas variantes.

### 4. Interpreten la cobertura por riesgo

Ejecuten npm run test:coverage:week11 y npm run bundle:release. El umbral publicado es 60% de ramas, 65% de funciones, 70% de líneas y 70% de sentencias en el alcance configurado. Cumplirlo no demuestra por sí solo que el flujo funciona: expliquen qué riesgos cubren las pruebas.

## Términos que usarán

- **Regresión:** Fallo que aparece en un comportamiento que antes funcionaba.
- **Prueba de regresión:** Prueba que reproduce el defecto y ayuda a detectar si reaparece.
- **Debug / release:** Variantes orientadas al desarrollo y a la distribución, cuyas diferencias pueden revelar fallos.
- **Cobertura:** Medida de qué partes del código ejecutan las pruebas; no mide por sí sola su calidad.

## ¿Qué archivos deben entregar?

Las rutas son relativas a la raíz del repositorio. Además del código y las pruebas del hito, deben quedar estos archivos:

| Archivo | Qué debe contener |
|---|---|
| `docs/test-strategy.md` | Estrategia de pruebas acumulativas, variantes y justificación de cobertura por riesgo. |
| `reports/week-11/debug-release.json` | Evidencias de ambas variantes; incluir variants con debug y release, además del formato común de reportes. |
| `reports/week-11/defect-trace.json` | Causa, corrección y prueba de regresión en rootCause, correction y regressionTest, además del formato común y resultados antes/después. |
| `evidence/week-11/engineering.json` | Decisión justificada, alternativas, beneficios y costos, requisito y comprobación relacionada. |
| `evidence/week-11/individual.json` | Un registro técnico por integrante; los tres se reúnen en un solo archivo. |

**Decisión que deben justificar:** Justifiquen por qué la prueba demuestra la causa del defecto y no únicamente su síntoma.

El formato de reportes, campos JSON y evidencia individual se explica en `STARTER_AND_REPOSITORY.md` y `docs/EVIDENCE_CONTRACT.md`. No basta con crear archivos vacíos o escribir que las pruebas pasaron: conserven comandos y observaciones reales.

## ¿Cómo comprueban y entregan?

Sigan el orden completo de `STARTER_AND_REPOSITORY.md`: guarden el código, completen evidencias, ejecuten `make feedback`, `make verify-week-11` y `make public-test-week-11`, y guarden el commit exclusivo de reportes/evidencias. Después creen la etiqueta **`week-11-final`** y ejecuten **`make evidence-week-11`**. Ese último comando necesita que la etiqueta ya exista.

Cuando las comprobaciones pasen, suban la versión y la etiqueta a GitHub. En Classroom entreguen **el enlace del repositorio, `week-11-final` y su SHA completo**. El SHA identifica exactamente la versión que se calificará; los cambios posteriores no forman parte de esa entrega. No basta con adjuntar capturas o guardar el proyecto sólo en su computadora.

La guía de entrega también está en el ZIP como `docs/assignments/week-11-repository.md`.

## ¿Cómo se califica?

- **AC-01 — 2.5 puntos:** instalación y verificación reproducibles desde la versión entregada.
- **AC-02 — 2 puntos:** Existe un defecto reproducible, una prueba de regresión y evidencia de comportamiento equivalente en debug y release; la cobertura cumple los umbrales publicados y se interpreta por riesgo.
- **AC-03 — 1.5 puntos:** Demuestren la corrección sin ignorar pruebas, desactivar optimizaciones para esconder el fallo ni usar sólo la cobertura global como prueba de éxito.
- **AC-04 — 1.5 puntos:** decisión técnica justificada y relacionada con una prueba y su resultado.
- **AC-05 — 0.5 puntos:** aportación técnica individual verificable y explicación cuando se solicite.

**Total: 8 puntos.** Lean `RUBRIC_PUBLIC.md` para los niveles completo, parcial y sin crédito y para las condiciones que limitan la calificación. El ZIP la incluye en `docs/assignments/week-11-rubric.md`.

## Cómo se obtiene tu calificación

La actividad **no se califica por cantidad de archivos ni por número de commits**. Se suman cinco criterios independientes y el resultado máximo es **8 puntos**:

1. **AC-01 — 2.5 puntos, automático.** Se fija tu tag/SHA y se reproduce el proyecto. El nivel completo requiere instalación y checks obligatorios reproducibles; una deficiencia no crítica reproducible es parcial; sin reproducción o con el check central fallido no hay crédito.
2. **AC-02 — 2 puntos, automático.** Se ejecutan las pruebas públicas y los casos declarados. El nivel completo requiere demostrar el comportamiento completo y sus límites; el nivel parcial significa que el flujo principal funciona pero falla un caso límite. En este hito se busca: Existe un defecto reproducible, una prueba de regresión y evidencia de comportamiento equivalente en debug y release; la cobertura cumple los umbrales publicados y se interpreta por riesgo.
3. **AC-03 — 1.5 puntos, automático.** Se reproduce la falla declarada y se revisa su manejo. El nivel completo requiere una corrección segura y evidencia útil; evidencia incompleta es parcial; un cierre inesperado, bucle, corrupción o exposición no obtiene crédito. Para esta semana deben demostrar: Demuestren la corrección sin ignorar pruebas, desactivar optimizaciones para esconder el fallo ni usar sólo la cobertura global como prueba de éxito.
4. **AC-04 — 1.5 puntos, semiautomático.** Se valida `engineering.json` y se contrasta con el repositorio. El nivel completo conecta requisito, alternativas, decisión, trade-off, prueba y resultado; un documento genérico o contradictorio no obtiene crédito. La decisión central es: Justifiquen por qué la prueba demuestra la causa del defecto y no únicamente su síntoma.
5. **AC-05 — 0.5 puntos, semiautomático.** Se revisa `individual.json` y la señal técnica de cada integrante. El nivel completo es una aportación verificable y explicable; una señal limitada pero coherente es parcial; la ausencia de evidencia no obtiene crédito. Los flags y la muestra rotativa sólo activan corroboración: no son un descuento automático.

Los tres primeros criterios suman **6 puntos automáticos** y los dos últimos **2 puntos semiautomáticos**. No hay puntos manuales rutinarios. Los quality gates son límites, no descuentos adicionales; si coinciden varios, se aplica una sola vez el límite más restrictivo. La rúbrica no asigna un porcentaje inventado al nivel parcial: el resultado se determina por la evidencia observada en cada criterio.

GitHub Actions ofrece retroalimentación; la calificación final se obtiene al verificar la versión entregada. No usen secretos ni datos reales, no alteren pruebas para forzar éxito y no sustituyan evidencia ejecutable con capturas. Mantengan las políticas de IA y evidencia individual explicadas en la guía de entrega.

## Antes de cerrar esta semana

- Comprueben el funcionamiento requerido y el caso de falla, no sólo el camino exitoso.
- Revisen que código, documentos y reportes describan la misma versión.
- Confirmen la aportación de los tres integrantes y el envío de etiqueta y SHA.
- Cada integrante debe responder el **quiz semanal 11** por separado: **3 preguntas, 2 puntos**, adicionales a los 8 de esta actividad. Ambos forman parte de la evaluación continua.
