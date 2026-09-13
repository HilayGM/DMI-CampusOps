# ADR-001: Arquitectura por Capas

## Estado
Aprobado

## Contexto y Alternativas
Se evaluó una arquitectura monolítica tradicional frente a una arquitectura limpia por capas. La alternativa seleccionada nos permite separar UI, Aplicación, Dominio e Infraestructura.

## Decisión
Se implementará una arquitectura limpia separando UI, Aplicación, Dominio e Infraestructura para desacoplar el sistema.

## Consecuencias
Como consecuencia, se mejora la testabilidad y el mantenimiento a largo plazo, aunque se añade una ligera sobrecarga inicial en la definición de interfaces y contratos.