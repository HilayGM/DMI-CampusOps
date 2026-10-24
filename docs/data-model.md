# Modelo de datos, persistencia y cola local — Semana 08

Este documento describe el modelo de datos local de CampusOps para soporte de trabajo sin conexión (offline-first), la estructura de la cola de operaciones pendientes, el manejo durable de notas y evidencias fotográficas, y las garantías de persistencia y migración.

---

## 1. Esquema de datos local de incidencias

El modelo de dominio de CampusOps maneja incidencias con datos sintéticos, minimizados y tipados:

| Campo | Tipo | Descripción | Restricciones / Reglas |
| --- | --- | --- | --- |
| `id` | `string` | Identificador único de la incidencia. | Clave primaria inmutable (`demo-inc-XXX` o UUID). |
| `title` | `string` | Título sintético descriptivo. | No debe contener identificadores personales reales. |
| `description` | `string` | Detalle del problema reportado. | Sanitizable para telemetría. |
| `status` | `IncidentStatus` | Estado del ciclo de vida. | `'open' \| 'assigned' \| 'in_progress' \| 'resolved' \| 'closed'`. |
| `category` | `IncidentCategory` | Categoría de la falla. | `'electrical' \| 'laboratory' \| 'water' \| 'connectivity' \| 'equipment' \| 'safety' \| 'maintenance'`. |
| `location` | `string` | Ubicación física sintética en el campus. | Formato descriptivo (`Campus · Edificio · Aula`). |
| `version` | `number` | Versión incremental del registro. | Entero positivo para control de concurrencia optimista. |
| `assigneeId` | `string \| null` | Identificador del técnico asignado. | `null` si la incidencia no está asignada. |

---

## 2. Cola local de operaciones pendientes (`OfflineOperationQueue`)

Cuando un técnico o reportante ejecuta una acción en modo desconectado, la mutación no se descarta ni se conserva únicamente en la memoria volátil de la aplicación. Se encola en la estructura persistente `OfflineOperationQueue`.

### 2.1 Estructura del registro de operación (`StoredPendingOperation`)

Cada entrada encolada cuenta con identidad estable e inmutabilidad estricta:

```typescript
export type StoredPendingOperation = Readonly<{
  operationId: string;                     // Identidad UUID estable para idempotencia
  incidentId: string;                      // Incidencia afectada
  baseVersion: number;                     // Versión del servidor con la que se originó el cambio
  actorId: string;                         // Identificador del usuario que generó el cambio
  authorId: string;                        // Alias semántico para compatibilidad de autor
  action: string;                          // Tipo de mutación ('start_work', 'add_note', etc.)
  payload: Readonly<Record<string, unknown>>; // Datos específicos de la operación
  createdAt: number;                       // Marca de tiempo en milisegundos (orden FIFO)
  status: 'pending' | 'syncing' | 'failed'; // Estado del ciclo de sincronización
}>;
```

### 2.2 Notas y referencias a fotografías fuera de línea

Las notas técnicas y fotografías capturadas durante la atención en campo requieren disponibilidad inmediata para el técnico, incluso si apaga o reinicia el dispositivo antes de recuperar conectividad:

1. **Notas pendientes (`OfflineNote`):**
   * Se almacenan dentro de la cola bajo la acción `add_note` o `diagnosis`.
   * Campos conservados: `noteId`, `incidentId`, `authorId`, `text`, `createdAt`.
   * Se recuperan directamente mediante `getPendingNotes(incidentId)` para renderizar el historial offline en la interfaz.

2. **Evidencia fotográfica (`OfflinePhotoReference`):**
   * Los archivos binarios de imagen se almacenan en el sistema de archivos local del dispositivo (e.g., directorio de caché o sandbox de la aplicación).
   * La cola persistente almacena la **referencia URI local** (`localUri`), descripción (`caption`), autor y fecha de captura.
   * Evita almacenar blobs pesados en la base de datos mientras garantiza que la referencia apunte a un archivo accesible entre reinicios.
   * Se recuperan mediante `getPendingPhotos(incidentId)`.

---

## 3. Garantías de durabilidad, reinicio e idempotencia

### 3.1 Durabilidad entre reinicios
* La cola desacopla el driver de almacenamiento mediante la interfaz `KeyValueStore` (`getItem`, `setItem`, `removeItem`).
* Toda operación `enqueue`, `dequeue` o `confirm` ejecuta una persistencia atómica en el almacenamiento duradero (`campusops.offline_queue.v1`).
* Ante un reinicio completo del sistema, cualquier nueva instancia de `OfflineOperationQueue` que apunte al mismo almacén reconstruye la lista ordenada sin pérdida de datos.

### 3.2 Idempotencia por identidad estable (`operationId`)
* Si la aplicación o el usuario reintenta encolar una operación con un `operationId` ya existente, la cola preserva la operación original sin duplicar el registro ni mutar su contenido.
* Durante la sincronización con el backend, las operaciones confirmadas se retiran selectivamente (`confirm([operationIds])`) mediante su identificador, conservando intactas aquellas operaciones que sigan pendientes o que hayan resultado en conflicto.

### 3.3 Resiliencia y manejo seguro ante corrupción
* Si el almacenamiento persistente sufriera una corrupción de datos (e.g., JSON malformado por fallo de hardware), `listPending()` atrapa el error de análisis y devuelve una lista vacía controlada en lugar de causar un cierre inesperado (crash) de la aplicación.

---

## 4. Política de migración y evolución del esquema

1. **Versionado de esquema:**
   * El almacén local declara `schemaVersion: 1`. Toda evolución futura (v2, v3) requiere una función de migración explícita.
2. **Preservación de la cola durante migraciones:**
   * Las migraciones de esquema de datos de incidencias nunca deben purgar ni alterar la cola de operaciones pendientes no sincronizadas.
3. **Atomicidad y Rollback:**
   * Cada migración debe ejecutarse dentro de un límite transaccional. Si una migración falla a mitad de su ejecución, el sistema revierte inmediatamente al estado previo (rollback) para evitar estados parcialmente migrados o inconsistentes.
