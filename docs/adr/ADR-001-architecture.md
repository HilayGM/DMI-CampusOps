# ADR 001: Selección de Arquitectura de Software

## Contexto
El stack tecnológico principal del proyecto ya se encuentra definido (React Native). Sin embargo, es fundamental decidir qué patrón arquitectónico utilizar para estructurar el código de la aplicación. Esta decisión es crítica para asegurar la mantenibilidad a largo plazo, la facilidad de integrar pruebas automatizadas y la capacidad de adaptarse a cambios futuros, como la migración a una nueva base de datos o el reemplazo del proveedor de servicios de geolocalización (GPS).

## Alternativas Consideradas

### Opción 1: MVC Tradicional (Model-View-Controller)
El patrón MVC separa la aplicación en tres componentes principales: el Modelo (datos y lógica de negocio), la Vista (interfaz de usuario) y el Controlador (intermediario que maneja la entrada del usuario y actualiza el Modelo y la Vista).

**Ventajas:**
- Ampliamente conocido y documentado.
- Menor curva de aprendizaje inicial.
- Desarrollo rápido en las fases tempranas del proyecto.

**Desventajas:**
- Tiende a crear Controladores muy grandes y complejos que asumen demasiadas responsabilidades.
- Alto acoplamiento entre la lógica de negocio y las tecnologías externas (ej. base de datos, servicios GPS), lo que dificulta el cambio de estos proveedores.
- Pruebas unitarias más complejas de implementar debido al acoplamiento inherente.

### Opción 2: Clean Architecture / Arquitectura Hexagonal
Tanto Clean Architecture como la Arquitectura Hexagonal (Puertos y Adaptadores) proponen una separación en capas concéntricas, donde las dependencias siempre apuntan hacia el interior (hacia el núcleo del dominio y la lógica de negocio). La interfaz de usuario (React Native), la base de datos y los servicios externos (como el GPS) residen en la capa más externa, comunicándose con el núcleo a través de interfaces mediante el principio de inversión de dependencias.

**Ventajas:**
- **Alto desacoplamiento:** La lógica central de la aplicación no sabe nada sobre cómo se guardan los datos, el framework de UI o las APIs de terceros.
- **Altamente testeable:** La lógica de negocio se puede probar de manera completamente aislada usando *mocks* o *stubs* para la base de datos y el GPS, sin necesidad de conectarse a servicios reales.
- **Flexibilidad extrema:** Cambiar de tecnología o proveedor en el futuro requiere únicamente crear una nueva implementación en la capa externa, sin modificar el núcleo de la aplicación.

**Desventajas:**
- Mayor complejidad estructural al inicio del proyecto y curva de aprendizaje más pronunciada.
- Requiere escribir más código repetitivo ("boilerplate") inicial para definir interfaces, casos de uso y adaptadores.

## Decisión
Se ha decidido adoptar **Clean Architecture (o Arquitectura Hexagonal)** para el desarrollo de la aplicación.

## Justificación
La elección de una arquitectura basada en capas y puertos/adaptadores se fundamenta directamente en los criterios de evaluación solicitados para el proyecto:

1. **Facilidad de prueba:** Al utilizar la inversión de dependencias, Clean Architecture permite aislar completamente los casos de uso (lógica de negocio). Esto significa que podemos escribir pruebas unitarias rápidas y fiables para la lógica central simulando (mocking) los repositorios de datos y el servicio de GPS. En un patrón MVC, probar la lógica suele requerir pruebas de integración más lentas y frágiles debido al acoplamiento con la base de datos o APIs.
2. **Complejidad:** Aunque Clean Architecture introduce una mayor complejidad estructural al inicio del proyecto (creación de entidades, interfaces/puertos y adaptadores), esta complejidad se compensa rápidamente a medida que la aplicación crece. Evita el problema del "código espagueti" y los controladores gigantes típicos de MVC, haciendo que el mantenimiento a largo plazo sea mucho más predecible y menos complejo.
3. **Cambio de proveedores (Base de Datos o GPS):** Este es el beneficio más importante de la decisión. Si en el futuro necesitamos cambiar el proveedor de la base de datos local o el servicio que nos provee la geolocalización (GPS), **solo tendremos que crear un nuevo adaptador** en la capa de infraestructura que cumpla con la interfaz definida por nuestro dominio. La lógica de negocio permanecerá completamente intacta, ya que desconoce los detalles de implementación de estas tecnologías. En un MVC tradicional, un cambio de proveedor probablemente requeriría modificar el código a lo largo de múltiples controladores y modelos, con un alto riesgo de introducir fallos.

## Consecuencias
- El equipo de desarrollo deberá adoptar y seguir rigurosamente los principios de diseño de Clean Architecture (SOLID, Inversión de Dependencias).
- Se requerirá un esfuerzo inicial mayor para establecer la estructura de carpetas y definir las interfaces clave antes de implementar la funcionalidad visible.
- A largo plazo, se garantizará un código más limpio, robusto y fácil de adaptar a nuevos requerimientos técnicos o de negocio.
