# ADR-001 — Arquitectura interna de CampusOps

## Estado

Aceptada para el esqueleto de Semana 02. Este ADR describe la implementación existente; no acredita la ejecución de pruebas ni sustituye las evidencias del equipo.

## Contexto

CampusOps utiliza React Native, Expo y TypeScript, un stack ya definido. La decisión pendiente es cómo organizar sus responsabilidades internas. Semana 01 dejó una pantalla con una comprobación de salud del backend; Semana 02 añade lista y detalle de incidencias ficticias sin convertir las pantallas en clientes de proveedores concretos.

La UI debe presentar datos y gestionar interacción; Application coordina consultas mediante contratos; Domain conserva un modelo independiente de frameworks; Infrastructure implementa los puertos. La composición selecciona y conecta las implementaciones. Esta separación permite contrastar la arquitectura con imports, código y pruebas, y sustituir proveedores sin introducir su implementación en las pantallas.

## Requisitos y restricciones

- Consultar una lista de incidencias ficticias, seleccionar una, abrir su detalle y volver.
- Mantener datos deterministas en memoria y componentes sustituibles mediante inyección.
- Conservar el texto `CampusOps`, `testID="backend-status"` y los estados `checking`, `available` y `offline`.
- Permitir consultar incidencias aunque la comprobación histórica de salud falle o siga pendiente.
- Evitar imports de infraestructura desde UI o Application y dependencias de frameworks en Domain.
- Reutilizar `src/campusops/contracts.ts`, conservar las rutas existentes y no añadir librerías de navegación.
- No implementar aún backend real de incidencias, autenticación, sesión, persistencia, sincronización, cola offline, permisos, cámara, mapas o proveedor de ubicación.

La consulta HTTP histórica de salud ya existe y se conserva. No obtiene incidencias ni acredita una integración de incidencias con un backend.

## Alternativa 1 — Pantallas conectadas a servicios concretos

Organizar componentes por funcionalidad y permitir que las pantallas importen directamente un servicio o repository concreto.

**Ventajas:** menos archivos, desarrollo inicial rápido y menos abstracciones para una aplicación pequeña.

**Desventajas:** acopla la UI al proveedor y hace que lo conozca; dificulta probar con dobles sin simular módulos concretos; aumenta el costo de sustituir proveedores. Además, contradice el límite requerido entre UI e infraestructura. Separar `fetch` en un archivo no elimina ese acoplamiento si la pantalla importa directamente el adaptador.

## Alternativa 2 — Responsabilidades separadas con puertos

Separar UI, Application, Domain, Infrastructure y Composition dentro de la organización actual del proyecto. Application define los puertos que necesita y recibe sus implementaciones mediante inyección.

**Ventajas:** mayor testabilidad, dominio independiente, proveedores sustituibles, dependencias explícitas y responsabilidades que pueden evolucionar por separado.

**Costos:** más archivos, interfaces y conceptos; construcción explícita de dependencias y mayor complejidad estructural inicial.

## Decisión

Adoptar la alternativa 2, que corresponde al código existente:

| Responsabilidad | Ubicación real | Función |
|---|---|---|
| UI | `src/campusops/ui/` | Presentación, estados de consulta y navegación local |
| Application | `src/campusops/application/` | Consultas y puertos internos |
| Domain | `src/campusops/domain/` | Modelo puro de incidencia |
| Vocabulario de Domain | `src/campusops/contracts.ts` | Tipos públicos reutilizados, sin mover el archivo |
| Infrastructure | `src/campusops/infrastructure/` | Repository fake en memoria |
| Infraestructura histórica | `src/api/courseBackend.ts` | Adaptador HTTP de salud, conservado en su ruta |
| Composition | `src/composition/` y montaje en `App.tsx` | Selección de proveedores, adaptación y entrega de props |

La dirección principal es UI → Application → Domain. La UI también importa tipos de Domain para presentar incidencias: el código no impone que todo acceso a tipos pase por Application.

`Incident` contiene ID, título, descripción, estado, categoría y ubicación textual. Reutiliza `IncidentStatus` e `IncidentCategory`. La ubicación actual es una cadena ficticia; no utiliza coordenadas ni un proveedor.

### Puertos existentes

`IncidentRepository`, en `application/ports/IncidentRepository.ts`, declara:

- `list(): Promise<readonly Incident[]>`.
- `getById(id: string): Promise<Incident | null>`.

`createIncidentQueries(repository)`, en `application/incidentQueries.ts`, devuelve las funciones de lista y detalle que delegan en el puerto recibido. Una lista vacía se conserva como `[]`; un ID inexistente produce `null`; los fallos del proveedor permanecen como rechazos. Actualmente son consultas delgadas: no implementan autorización, mutaciones ni reglas de transición.

`BackendHealthPort`, en `application/ports/BackendHealthPort.ts`, es un tipo de función `() => Promise<void>`. Resolver indica disponibilidad; rechazar indica fallo de la comprobación. No es una interfaz de autenticación ni de incidencias.

`InMemoryIncidentRepository` implementa el puerto de incidencias. Contiene tres fixtures con IDs estables, estados y categorías válidos. Congela la colección interna y sus objetos; devuelve copias para que un consumidor no altere los fixtures. Como todos los campos del modelo son escalares, las copias superficiales son suficientes para este modelo.

## Dependencias permitidas

| Origen | Puede depender de | No debe depender de |
|---|---|---|
| UI | Contratos y consultas de Application, tipos de Domain, React, React Native y componentes visuales Expo | Infrastructure, API concreta, fake o Composition |
| Application | Puertos propios y Domain | Proveedores concretos, UI, React Native o Expo |
| Domain | Tipos puros y vocabulario de `contracts.ts` | Application, UI, Infrastructure, frameworks, HTTP o almacenamiento |
| Infrastructure | Puertos de Application, Domain y APIs técnicas necesarias | UI o Composition |
| Composition y raíz de montaje | Implementaciones concretas, puertos, consultas y pantalla raíz | No debe ser importada por las capas internas |

Los imports de tipos también expresan dependencias arquitectónicas, aunque desaparezcan al ejecutar JavaScript. Los archivos de pruebas pueden conocer implementaciones y dobles para comprobarlos; no son pantallas ni casos de uso productivos.

## Punto de composición

`src/composition/campusOpsDependencies.ts` crea una instancia de `InMemoryIncidentRepository` al cargar el módulo y la entrega a `createIncidentQueries`. Define además `checkBackendHealth`, una función tipada como `BackendHealthPort` que espera a `getBackendHealth()` y no expone su payload a la UI.

`getBackendHealth` permanece intacto en `src/api/courseBackend.ts`: consulta `/health`, comprueba la respuesta y puede rechazar. La adaptación del contrato a `Promise<void>` ocurre en composición, no en la pantalla.

`App.tsx` importa el objeto `campusOpsDependencies` y monta `CampusOpsScreen` expandiéndolo como props. El módulo de dependencias no importa UI; es `App.tsx` quien conecta las dos partes. La raíz de montaje pertenece conceptualmente a composición aunque esté fuera de `src/composition/`.

La UI no importa `InMemoryIncidentRepository` ni `getBackendHealth`.

### Flujo real de consulta

1. `App.tsx` monta `CampusOpsScreen` con las funciones compuestas.
2. `CampusOpsScreen` llama a `incidents.list()` y entrega los resultados a `IncidentListScreen`.
3. La selección comunica un ID al contenedor, que llama a `incidents.getById(id)`.
4. Las consultas delegan en `IncidentRepository`; el objeto que satisface ese puerto es el fake inyectado.
5. `IncidentDetailScreen` recibe la incidencia como prop. El botón visible `Volver`, situado en el contenedor, restaura la lista. También existe manejo de regreso físico de Android.

En ejecución, el recorrido es App → CampusOpsScreen → incidentQueries → puerto satisfecho por el fake. Ese recorrido no es un import de la UI hacia el fake.

La navegación utiliza estado local, sin React Navigation ni Expo Router. El contenedor presenta carga, error con reintento y detalle inexistente; la lista presenta vacío. Los efectos ignoran respuestas obsoletas después de su limpieza. La consulta de salud usa un efecto independiente y no bloquea las consultas de incidencias.

## Consecuencias

### Beneficios

- Desacoplamiento entre pantallas y proveedores concretos.
- Testabilidad de las consultas mediante repositorios alternativos.
- Sustitución del proveedor desde composición.
- Dominio independiente de React, React Native y Expo.
- Responsabilidades claras y conservación de los contratos históricos de Semana 01.

### Costos

- Más archivos, puertos y estructura que una solución monolítica pequeña.
- Inyección explícita de dependencias y más conceptos que mantener.
- Consultas que por ahora delegan operaciones simples y añaden indirección.
- Necesidad de mantener coherentes contratos, composición, pruebas y documentación.
- Las reglas de imports deben verificarse; tener carpetas con nombres de capas no las impone automáticamente.

## Trade-off

Se acepta mayor **complejidad** inicial para mejorar la **testabilidad** y reducir el costo del **cambio de proveedor**. Un doble puede sustituir `IncidentRepository` sin modificar la UI; a cambio, es necesario definir puertos y construir dependencias incluso para tres incidencias ficticias.

La navegación local reduce dependencias y satisface lista → detalle → volver, pero no ofrece rutas persistentes, enlaces profundos ni un historial complejo. La memoria simplifica el esqueleto, pero no conserva datos tras reiniciar y no demuestra persistencia offline.

## Testabilidad

`src/campusops/__tests__/incidentQueries.test.ts` contiene pruebas de lista determinista, detalle correcto, ID inexistente, repository alternativo, lista vacía, rechazos y protección de fixtures.

`src/campusops/__tests__/incidentNavigation.test.tsx` contiene pruebas del flujo con backend offline, salud pendiente, carga y vacío, errores con reintento, detalle inexistente, respuestas obsoletas y regreso físico de Android. Las pantallas reciben funciones por props, por lo que pueden probarse sin un proveedor real.

`course-tests/smoke.test.tsx` conserva el contrato histórico de título y estado de salud mediante un mock del módulo original.

Estas referencias describen pruebas escritas, no resultados aprobados. La validación previa con Jest, TypeScript y ESLint quedó pendiente por dependencias no instaladas. Este ADR no registra resultados nuevos ni crea reportes o evidencias.

El test público de Semana 02 revisa el ADR y el diagrama mediante contenido textual; por sí solo no verifica imports reales ni comportamiento móvil.

## Cambio de proveedor

Una implementación futura deberá satisfacer `IncidentRepository` y sustituir la instancia seleccionada en `campusOpsDependencies.ts`. Si conserva el modelo y la semántica de lista, ausencia y errores, las consultas y pantallas no necesitan conocer el nuevo proveedor.

Si un proveedor futuro utiliza DTO diferentes, la traducción al modelo interno corresponderá a su adaptador. Un cambio del contrato o de los requisitos funcionales sí podría requerir cambios en capas internas. No se afirma que exista ya un adaptador remoto, persistente o externo de incidencias.

## Funcionalidades futuras

Los siguientes elementos son **límites previstos / responsabilidades futuras**, no servicios implementados en Semana 02:

| Límite | Responsabilidad futura | Situación actual |
|---|---|---|
| Sesión | Identidad, autenticación y ciclo de sesión | No implementado |
| Persistencia | Conservación local y recuperación de datos; posterior sincronización | No implementado; el fake sólo vive en memoria |
| Ubicación/proveedor de ubicación | Obtención de ubicación y adaptación del proveedor | No implementado; la incidencia sólo muestra texto ficticio |

Incidencias sí tiene consulta de lista y detalle. Creación completa, asignación, cierre y demás mutaciones quedan fuera del esqueleto actual.

Los perfiles **reportante**, **técnico** y **coordinador** están contemplados en el vocabulario `CampusRole`. No existen selección de perfil, autorización ni vistas filtradas por rol en la implementación móvil de Semana 02. El diagrama los muestra como contexto del diseño, sin conexiones que simulen autorización funcional.

La existencia de tipos como `IncidentLocation` y `PendingIncidentOperation` en el vocabulario público no acredita geolocalización, persistencia o cola offline.

## Relación con la implementación

Rutas relativas a la raíz del repositorio:

| Archivo real | Responsabilidad documentada |
|---|---|
| `src/campusops/domain/Incident.ts` | Modelo de consulta puro |
| `src/campusops/contracts.ts` | Estados, categorías y vocabulario público |
| `src/campusops/application/ports/IncidentRepository.ts` | Puerto de lista y detalle |
| `src/campusops/application/ports/BackendHealthPort.ts` | Contrato mínimo de salud |
| `src/campusops/application/incidentQueries.ts` | Consultas con inyección |
| `src/campusops/infrastructure/InMemoryIncidentRepository.ts` | Proveedor ficticio en memoria |
| `src/campusops/ui/CampusOpsScreen.tsx` | Contenedor, navegación, salud y estados de consulta |
| `src/campusops/ui/IncidentListScreen.tsx` | Lista y selección |
| `src/campusops/ui/IncidentDetailScreen.tsx` | Presentación del detalle |
| `src/composition/campusOpsDependencies.ts` | Selección de implementaciones y adaptación de salud |
| `src/api/courseBackend.ts` | Adaptador histórico de salud HTTP |
| `App.tsx` | Montaje de la pantalla con dependencias |

El diagrama complementario está en [architecture.mmd](../architecture.mmd). Agrupa por responsabilidad, por lo que incluye el adaptador histórico dentro de Infrastructure y `App.tsx` dentro de la raíz conceptual de Composition sin afirmar que sus archivos se hayan movido.

## Regla verificable de imports

La prueba estática de Semana 02 analiza imports relativos dentro de `src` sin
ejecutar los módulos. Un módulo de Domain no puede importar UI y UI no puede
importar directamente Infrastructure; el flujo permitido pasa por
Application/Composition y los tipos puros de Domain. Una discrepancia
controlada `domain -> ui` se conserva como caso de falla documentado, pero no
como importación en el código entregado.
