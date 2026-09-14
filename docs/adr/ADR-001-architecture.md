# ADR-001: Límites de arquitectura

## Estado

Aceptada para el esqueleto de CampusOps.

## Contexto

CampusOps crecerá desde una pantalla inicial hacia incidencias, sesión,
persistencia y servicios. El dibujo debe representar límites que puedan
comprobarse sobre los imports del código, incluso mientras algunas capas aún
no tienen implementación.

## Decisión

Se conservarán cuatro límites principales: `ui`, `application`, `domain` e
`infrastructure`. La UI se comunica con casos de uso de application; domain
contiene reglas independientes; infrastructure contiene adaptadores técnicos.
La prueba de arquitectura bloqueará dos acoplamientos especialmente riesgosos:
un módulo de domain no puede importar UI y UI no puede importar directamente
infrastructure. Los imports externos y los imports relativos a contratos se
analizan sin ejecutar el código.

## Alternativas consideradas

1. Permitir todos los imports y confiar sólo en revisión manual.
2. Introducir aliases y un contenedor de dependencias antes de que existan los
   casos de uso completos.
3. Aplicar una matriz pequeña de límites verificables desde ahora.

## Consecuencia y trade-off

La matriz detecta temprano acoplamientos que harían difícil probar reglas de
negocio o reemplazar adaptadores. A cambio, todavía no modela todas las
dependencias futuras ni sustituye una revisión de diseño cuando se agreguen
casos de uso. La regla queda deliberadamente acotada a los dos bordes que el
equipo puede observar en este esqueleto.