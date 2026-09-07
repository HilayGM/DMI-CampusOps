# Definición del problema — CampusOps

## Problema

En el campus ficticio, los reportes de fallas de mantenimiento llegan por canales aislados y no dejan una trazabilidad común de su prioridad, asignación, atención y cierre. CampusOps concentra incidencias sintéticas de infraestructura para que la persona reportante sepa qué ocurrió, el técnico atienda sólo lo asignado y coordinación pueda priorizar y comprobar la resolución.

## Alcance

### Incluye

- Crear y consultar incidencias sintéticas con categoría, descripción, ubicación manual y evidencia preparada para el ejercicio.
- Clasificar prioridad, asignar o reasignar un técnico, registrar diagnóstico e historial, y avanzar por los estados `open`, `assigned`, `in_progress`, `resolved` y `closed`.
- Permitir que el técnico consulte trabajo asignado y deje cambios pendientes sin conexión para sincronizarlos sin pérdida silenciosa.

### No incluye

- Atención de emergencias, despacho en tiempo real o sustitución de los protocolos institucionales de seguridad.
- Uso de personas, credenciales, planos, ubicaciones o fotografías reales; el producto sólo maneja datos y cuentas sintéticas.
- Chat en tiempo real, pagos, reconocimiento de imágenes, panel web administrativo completo y publicación pública en tiendas durante esta primera versión.

## Actores y responsabilidades

- **Reportante:** crea una incidencia con datos sintéticos, consulta sus reportes y agrega información posterior; no asigna técnicos ni cierra casos.
- **Técnico:** consulta sólo incidencias que tiene asignadas, inicia la atención, registra diagnóstico/notas/evidencia y marca una resolución; no cierra ni modifica un caso reasignado a otra persona.
- **Coordinador:** consulta el conjunto de incidencias, prioriza, asigna o reasigna técnicos, revisa historial y evidencias, y cierra o reabre una resolución.

## Flujo principal

1. Reportar: el reportante registra categoría, descripción y ubicación manual; el sistema crea el caso en `open` y guarda el evento en el historial.
2. Asignar: el coordinador define prioridad y un técnico; el caso pasa de `open` a `assigned` y la asignación queda trazada.
3. Atender: el técnico asignado inicia el trabajo (`in_progress`), adjunta diagnóstico/notas/evidencia sintética y marca `resolved`; si está sin conexión, la operación queda en una cola persistente para sincronizarse después.
4. Cerrar: el coordinador revisa la resolución e historial y cambia el caso a `closed`; si falta evidencia o la resolución no es válida, lo reabre a `assigned` con un técnico asignado.

## Criterios de aceptación verificables

1. Dada una incidencia nueva con categoría, descripción y ubicación manual válidas, cuando el reportante la envía, entonces se crea con estado `open` y el historial muestra el evento de creación.
2. Dada una incidencia `open`, cuando el coordinador le asigna un técnico y una prioridad, entonces queda `assigned`, muestra el técnico asignado y conserva la asignación en el historial.
3. Dada una incidencia `assigned` al técnico A, cuando A registra diagnóstico y la marca resuelta, entonces pasa por `in_progress` a `resolved`; sólo el coordinador puede cambiarla a `closed` o reabrirla a `assigned`.
4. Dado que el técnico trabaja sin conexión y coordinación reasigna la incidencia, cuando el técnico sincroniza su cambio pendiente, entonces la app conserva la operación, señala el conflicto y no sobrescribe silenciosamente la reasignación.

## Trazabilidad de actores y criterios

La tabla relaciona los actores y flujos con los criterios numerados de la sección anterior. El conflicto es una condición de sincronización, no un estado de la incidencia.

| Actor(es) | Acción o flujo | Estado / condición | Criterio de aceptación relacionado |
| --- | --- | --- | --- |
| Reportante | Crear una incidencia con categoría, descripción y ubicación manual válidas. | `open` | Criterio 1: la incidencia se crea abierta y el historial registra el evento de creación. |
| Coordinador | Asignar un técnico y una prioridad a una incidencia abierta. | `open` → `assigned` | Criterio 2: el técnico asignado es visible y la asignación queda registrada en el historial. |
| Técnico asignado | Iniciar la atención, registrar el diagnóstico y marcar la incidencia como resuelta. | `assigned` → `in_progress` → `resolved` | Criterio 3: la atención y resolución corresponden al técnico asignado; éste no realiza el cierre reservado al coordinador. |
| Coordinador | Revisar la resolución y cerrar el caso o reabrirlo con un técnico asignado. | Cierre: `resolved` → `closed`. Reapertura: `resolved` o `closed` → `assigned`, con técnico asignado. | Criterio 3: sólo el coordinador puede cerrar o reabrir la incidencia. |
| Técnico y coordinador | Sincronizar un cambio pendiente del técnico realizado sin conexión después de una reasignación de coordinación. | Condición de conflicto entre el cambio local y la reasignación remota. | Criterio 4: se conserva la operación pendiente, se señala el conflicto y no se sobrescribe silenciosamente la reasignación. |
