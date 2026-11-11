# Estrategia de pruebas

## Diferencias Operativas: Debug vs Release y Empaquetado

En desarrollo, la variante Debug facilita la iteracion mediante herramientas de depuracion y ciclos de retroalimentacion rapidos. En produccion, Release prioriza la estabilidad y el rendimiento, y aplica minificacion y optimizacion del codigo para reducir el paquete y preparar la aplicacion para distribucion.

Las variables de entorno se configuran de acuerdo con el modo de ejecucion: los valores de desarrollo sirven a las herramientas y servicios de desarrollo, mientras que los valores de produccion se incorporan al proceso de compilacion para el entorno de distribucion. La validacion del empaquetado Android garantiza que `expo export --platform android` se ejecuta sin errores de dependencias circulares.
