# CampusOps — Política de Resiliencia, Integración y Fallback (Semana 09)

Este documento define la arquitectura de resiliencia de CampusOps para la integración con servicios externos (mapas, geocodificación y APIs REST), detallando la estrategia de caché, el mecanismo de alternativa manual determinista y las reglas de reintentos acotados con idempotencia ante fallas o respuestas perdidas.

---

## 1. Integración con Proveedor Externo de Geocodificación

CampusOps consume servicios de geocodificación y mapeo para asociar descripciones de incidencias reportadas en campus con coordenadas geográficas para el personal técnico.

### 1.1 Contrato del Proveedor
* **Endpoint de prueba didáctico:** `GET /v1/geocoding?q={termino_de_busqueda}`.
* **Payload esperado en éxito:**
  ```json
  {
    "label": "Biblioteca Central",
    "latitude": 19.3328,
    "longitude": -99.1873
  }
  ```
* **Restricciones y límites:**
  * Las APIs de geocodificación y mapas de terceros imponen cuotas de consumo y límites de tasa (*rate limits*).
  * Ante exceso de solicitudes, el proveedor responde con código de estado HTTP `429 Too Many Requests` y opcionalmente un encabezado `Retry-After` que indica la espera obligatoria antes de reintentar.
  * La disponibilidad de red en exteriores o sótanos del campus puede degradar la conexión a `timeout` o desconexión completa.

---

## 2. Estrategia de Caché Local de Ubicaciones (`GeocodingCache`)

Para evitar saturar cuotas de proveedores de terceros, mitigar errores 429 y permitir resolución inmediata durante desconexiones intermitentes, CampusOps implementa una caché local en memoria acotada.

### 2.1 Características de la Caché
1. **Normalización de Claves:** Las consultas se normalizan eliminando espacios en blanco en extremos y convirtiendo a minúsculas (`trim().toLowerCase()`). Por ejemplo, `"  Biblioteca Central  "` y `"biblioteca central"` acceden a la misma entrada en caché.
2. **Tiempo de Vida (TTL):** Las entradas poseen un TTL por defecto de 5 minutos (`300,000 ms`). Transcurrido ese periodo, la entrada se invalida automáticamente forzando una consulta fresca cuando haya conectividad.
3. **Capacidad Acotada y Desalojo:** La caché almacena hasta un máximo de 100 ubicaciones activas. Al alcanzar la capacidad máxima, se desaloja la entrada más antigua (*FIFO/LRU*), evitando fuga de memoria o sobrecarga en el dispositivo móvil.
4. **Resiliencia ante Fallos de Red:** Si una consulta ya fue resuelta previamente, CampusOps sirve las coordenadas cacheadas de inmediato sin emitir solicitudes HTTP al proveedor externo.

---

## 3. Alternativa Manual de Ubicación (`selectIncidentLocation`)

Cuando el proveedor externo de geocodificación no está disponible o entrega datos defectuosos, CampusOps **nunca bloquea el reporte ni inventa coordenadas sintéticas**.

### 3.1 Criterios de Selección y Validación
La función adaptadora `selectIncidentLocation(providerResult, manualFallbackLabel)` evalúa la respuesta externa bajo las siguientes reglas estrictas:

1. **Aceptación de Coordenadas del Proveedor (`source: 'provider'`):**
   * El resultado debe ser un objeto no nulo y no arreglo.
   * `label` debe ser una cadena de texto no vacía (se normalizan espacios).
   * `latitude` debe ser un número finito dentro del rango geodésico válido $[-90.0, 90.0]$.
   * `longitude` debe ser un número finito dentro del rango geodésico válido $[-180.0, 180.0]$.
   * Si cumple todas las condiciones, se retorna:
     ```json
     {
       "source": "provider",
       "label": "Biblioteca Central",
       "latitude": 19.3328,
       "longitude": -99.1873
     }
     ```

2. **Fallback a Ubicación Manual (`source: 'manual'`):**
   * Se activa inmediatamente ante:
     * Respuesta `null`, `undefined` o tipo primitivo.
     * Objeto con código de error HTTP (ej. `{ status: 429 }` o `{ status: 503 }`).
     * Datos incompletos (ausencia de `latitude`, `longitude` o `label`).
     * Coordenadas fuera de rango (ej. latitud $> 90$ o $< -90$, longitud $> 180$ o $< -180$).
     * Tipos inválidos (coordenadas pasadas como string, `NaN` o `Infinity`).
     * `label` vacío o compuesto exclusivamente por espacios en blanco.
   * **Garantía de integridad:** El fallback retorna exclusivamente:
     ```json
     {
       "source": "manual",
       "label": "Laboratorio Central - Edificio B"
     }
     ```
     **Sin incluir campos `latitude` ni `longitude` inventados**, preservando la veracidad de los datos en el sistema.

---

## 4. Política de Reintentos Acotados y Respuestas Perdidas (`planRetry`)

### 4.1 Reglas de Reintento
1. **Límite Estricto:** Se permiten reintentos únicamente para los intentos 1, 2 y 3. A partir del **intento 4**, se prohíbe cualquier reintento adicional (`retry: false`), informando de inmediato el fallo al usuario para evitar bucles infinitos y saturación del servidor.
2. **Respeto a `Retry-After`:** Ante respuestas `429 Too Many Requests`, si el servidor proporciona `retryAfterMs`, la siguiente solicitud programa su retraso exactamente a dicho valor.
3. **Protección de Operaciones Mutantes (`POST`):**
   * Un método `POST` (como crear, resolver o cerrar una incidencia) **sólo puede reintentarse si cuenta con una clave de idempotencia estable** (`idempotencyKey`).
   * Si se intenta reintentar un `POST` sin clave de idempotencia, el planificador rechaza el reintento de inmediato (`retry: false, requiresStableIdempotencyKey: true`), impidiendo la duplicación accidental de acciones, evidencias o notificaciones en el backend.
