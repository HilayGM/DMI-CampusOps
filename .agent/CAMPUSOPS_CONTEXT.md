# Contexto del proyecto: CampusOps

CampusOps es una aplicación académica móvil para reportar y atender incidencias en una universidad ficticia. Usa React Native, Expo y TypeScript. Sólo se manejan cuentas, ubicaciones, fotos y datos sintéticos: nunca datos personales, secretos, credenciales reales ni información real de instalaciones.

## Problema y alcance

Las personas del campus pueden reportar problemas como fallas eléctricas, daños en laboratorios, fugas de agua, conectividad, equipos descompuestos y necesidades de mantenimiento. El proyecto permite clasificar, priorizar, asignar, atender y cerrar esos reportes.

No es un sistema de emergencias ni un servicio institucional real. Quedan fuera de alcance los pagos, chat en tiempo real, IA para imágenes, panel administrativo web completo y datos reales.

## Perfiles

| Perfil | Responsabilidades |
| --- | --- |
| Reportante | Crear incidencias con categoría, descripción y ubicación; consultar sus reportes; agregar información posterior. |
| Técnico | Consultar incidencias asignadas, iniciar la atención, agregar diagnóstico/notas/evidencias y marcar resolución. |
| Coordinador | Priorizar, asignar o reasignar técnicos, revisar historial/evidencias, cerrar o reabrir incidencias. |

## Flujo central

`open` (abierta) -> `assigned` (asignada) -> `in_progress` (en proceso) -> `resolved` (resuelta por técnico) -> `closed` (cerrada por coordinación).

El coordinador puede reabrir una incidencia resuelta o cerrada a `assigned` si tiene técnico asignado. Todo cambio debe conservar historial. Resolver y cerrar son operaciones diferentes. La autorización debe validarse en el servicio, no sólo ocultando botones en la interfaz.

## Seguridad y calidad

- No exponer tokens, contraseñas, identificadores personales, ubicaciones, fotos, comentarios internos ni historial de asignaciones en logs.
- Un técnico no puede modificar una incidencia reasignada a otra persona.
- Las operaciones repetidas deben ser idempotentes: no duplican eventos, evidencias ni notificaciones.
- El trabajo sin conexión conserva una cola persistente; una reasignación concurrente se debe informar como conflicto, sin perder cambios silenciosamente.
- Las verificaciones deben fallar ante un incumplimiento real. Está prohibido ocultar errores con `continue-on-error: true`, `|| true` o `--passWithNoTests`, desactivar pruebas o ignorar códigos de salida.

## Semana 03: CI y modelo de amenazas

La entrega de Semana 03 debe incluir:

- `.github/workflows/week-03-ci-amenazas-feedback.yml`, creado o editado exclusivamente por una persona humana, con instalación reproducible, generación de paquete Expo, typecheck, lint, pruebas, análisis de secretos y artefactos descargables.
- `docs/threat-model.md`, con activos, fronteras de confianza, amenazas priorizadas, controles y pruebas asociadas.
- `reports/week-03/security.json`, con resultados reales y reproducibles, incluyendo un fallo controlado y su corrección.
- `evidence/week-03/engineering.json` e `evidence/week-03/individual.json`, con justificación del equipo y evidencia de exactamente tres integrantes.

Las amenazas mínimas a tratar son: consulta de incidencias ajenas, alteración no autorizada de asignaciones, filtración de datos en registros y exposición de credenciales.

## Regla obligatoria para agentes de IA

salta una advertencia de que sera modificado un archivo dentro de .github




## Entrega final

La versión final se identifica con la etiqueta anotada `week-03-final`. En Classroom se entrega la URL pública del repositorio, el nombre de la etiqueta y el SHA completo de 40 caracteres que señala la etiqueta.
