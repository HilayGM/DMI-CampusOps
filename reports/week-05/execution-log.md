# Cierre de evidencias tras el commit t?cnico

Esta secci?n describe el estado vigente y sustituye las notas de pendientes del registro hist?rico conservado debajo. HEAD y SHA evaluado: `b0f9d5e20f83e9ff37f96b8217e3d6db2f143ae7`. No se modific? c?digo t?cnico, workflows, pruebas p?blicas, evaluador ni configuraci?n de seguridad. No se crearon commits ni tags ni se hizo push o cambio de rama.

## Identidades y procedencia verificadas

- Mart?n: `abbb4f6f0b70dd555a450f45a30d28f9127d7f00`, autor Git HilayGM, asociado a Mart?n por el equipo: parser, pruebas del parser, adaptador p?blico y documento inicial.
- Felipe: `599ea65e4f8190a16e9e8da277a985156ed39974`, autor Git Felipe: cliente HTTP, consultas/creaci?n, composici?n, formulario y pruebas nominales/navegaci?n.
- Oscar: `b0f9d5e20f83e9ff37f96b8217e3d6db2f143ae7`, autor Git Oscar Martinez Martinez: exactamente los cuatro archivos t?cnicos del alcance de contrato/fallos/sanitizaci?n.

`git show --stat --format=fuller` verific? los tres commits; `git merge-base --is-ancestor` confirm? la integraci?n de Mart?n y Felipe (salidas 0). Las matr?culas y teamId=09 se conservaron de evidence/week-04/individual.json. Los archivos declarados se contrastaron program?ticamente con git diff-tree de cada commit. Reviews queda vac?o porque no se inventan revisiones. La verificaci?n integrada actual no se atribuye retrospectivamente a ejecuciones individuales de los autores.

## Entorno exacto del cierre

Se a?adi? al PATH del proceso `C:/Users/oscar/AppData/Local/Author Software/nvm/installs/v22.22.0` y se establecieron `npm_config_offline=true`, `EXPO_OFFLINE=1`, `EXPO_NO_TELEMETRY=1`. `node --version`: v22.22.0. `python3.14 --version`: Python 3.14.7. No se cambi? ninguna versi?n ni configuraci?n global. Se seleccion? Python mediante el par?metro admitido por Makefile. El ejecutable npm de NVM sigue rechazando el script delegado; no se alter? la confianza de NVM.

## Comandos ejecutados nuevamente y resultados

| Comando | Resultado observado |
|---|---|
| `npm.cmd run typecheck` | Salida 0; sin errores TypeScript. |
| `npm.cmd run lint` | Salida 0; sin diagn?sticos ESLint. |
| `npm.cmd test -- --ci --runInBand --no-cache --testTimeout=30000 src/campusops/_tests_ course-tests/public/week-04.test.ts course-tests/public/week-05.test.ts course-tests/public/week-02-architecture.test.ts course-tests/smoke.test.tsx` | Salida 0; 10 suites, 124 pruebas aprobadas, 0 fallidas, 0 snapshots; 33.899 s informados por Jest. |
| `npm.cmd run backend:self-test` | Salida 0; CampusOps backend contracts PASS y Controlled backend self-test passed. S?lo loopback. |
| `npm.cmd run bundle:release` | Salida 0; Android exportado en dist/export; 595 m?dulos, bundle 1.5 MB, metadata.json. |
| `make verify-week-05 PYTHON=python3.14` | Salida 1; 5 checks estructurales pass y 5 invocaciones npm fail por NVM4306. |
| `make public-test-week-05 PYTHON=python3.14` | Salida 1; 10 checks pass, incluidos archivos, SHA y los cuatro JSON obligatorios; 4 invocaciones npm fail por NVM4306. |
| `make feedback NPM=npm.cmd` | Salida 0; typecheck, lint, smoke 1/1, audit offline y bundle Android completados. |
| `python3.14 -` con validadores importados de tools/course_public_evaluator.py | validate_report de los dos reportes, validate_engineering y validate_individual devolvieron True. Se verific? tambi?n pertenencia de archivos a commits y que todos los fallos de verify/public-tests fueran NVM4306. Sin ejecutar main ni modo evidence, sin generar tag ni bytecode. |

Feedback ejecut? internamente `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:smoke`, `npm.cmd run audit:ci` y `npm.cmd run bundle:release`. Audit imprimi? cero vulnerabilidades en modo offline; no es una consulta actualizada en Internet. El smoke repetido no se cuenta como una prueba ?nica adicional: 124 pruebas ?nicas en la regresi?n y 125 ejecuciones contando esa repetici?n, ninguna fallida en este cierre.

Los evaluadores intentaron realmente `npm run typecheck`, `npm run lint`, `npm run audit:ci`; verify tambi?n `npm run test:smoke` y `npm run backend:self-test`; public tambi?n `npm test -- --ci --runInBand course-tests/public/week-05.test.ts`. Las nueve invocaciones se rechazaron con NVM4306: delegated script is not trusted. Sus resultados completos se conservan en verify.json y public-tests.json generados oficialmente; no se corrigieron a mano para declarar pass.

## Operaciones de inspecci?n y edici?n de evidencias

Se ejecutaron git status --short, git branch --show-current, git log -5 con autor/SHA/asunto, git show --stat --format=fuller para los tres SHA, git merge-base --is-ancestor, git diff --exit-code y git diff-tree --no-commit-id --name-only -r. Get-Content ley? contratos, evidencias previas, reportes, Makefile, .nvmrc, package.json, evaluador, clientErrors y workflows. Get-Command localiz? python3.14/npm/node. Una comparaci?n PowerShell con Get-Content y normalizaci?n s?lo de etiquetas semanales confirm? Week 04/05 equivalentes a Week 03. Ning?n workflow se modific?.

Una b?squeda rg localiz? cinco marcadores de SHA pendiente; scripts locales mediante python3.14 y apply_patch actualizaron s?lo reports/week-05 y evidence/week-05, crearon individual.json y actualizaron resultados. Los reportes oficiales regenerados ya usan HEAD directamente. Los checks finales incluyen git diff --check, b?squeda sin coincidencias del marcador, validaci?n de JSON y git status --short. No se ejecut? make evidence-week-05 porque exige el tag final.

## Estado vigente

Evidencias completas con SHA real y esquema v?lido: individual.json tiene exactamente tres integrantes; engineering describe la implementaci?n real y conserva verificaciones fallidas como fallidas. contract-tests contiene nueve checks aprobados. failure-matrix conserva siete checks aprobados y tres fallidos: un antecedente hist?rico de timeout del runner y los dos bloqueos actuales del evaluador. No quedan pendientes de SHA ni de miembros. La limitaci?n restante es NVM4306 en los comandos oficiales semanales; estos archivos documentan el estado real para el commit de evidencias, no una entrega acad?mica totalmente aprobada.

---

# Registro hist?rico anterior al cierre (no describe pendientes actuales)

# Semana 05: ejecución técnica de Oscar

Trabajo sin commit sobre `week5/contract-failure-tests`. No se ejecutaron commit, push, tag, checkout ni `evidence-week-05`. `individual.json` permanece ausente. Los checks con fallo no se han convertido en éxitos.

## Entorno de los comandos

PowerShell, Node instalado 22.22.0. Para los comandos npm se añadió al PATH del proceso `C:/Users/oscar/AppData/Local/Author Software/nvm/installs/v22.22.0` y se estableció `npm_config_offline=true`. No se instalaron paquetes. Python disponible: `python3.14`, versión 3.14.7. GNU Make 3.81. Los alias python/python3 de Windows no pudieron ejecutarse. `npm` invocado por el evaluador resolvió al ejecutable de NVM y fue bloqueado con NVM4306; no se alteró la confianza de NVM.

Para la exportación final y feedback final se añadieron `EXPO_OFFLINE=1` y `EXPO_NO_TELEMETRY=1`. El primer reintento de exportación requirió permiso para ejecutarse fuera del sandbox tras EPERM de Expo. Los tests HTTP usan fetch inyectado; backend:self-test sólo usa loopback y puerto efímero.

## Comandos de comprobación y resultados observados

1. `npm.cmd run typecheck`: primer intento salida 1, TS2532 en acceso a mock.calls[0]. Corregido con acceso opcional. Repetición final salida 0; también pasó dentro de feedback final.
2. `npm.cmd run lint`: salida 0 en ejecución inicial y final; también pasó dentro de feedback final.
3. `npm.cmd test -- --ci --runInBand --no-cache src/campusops/_tests_/HttpIncidentRepository.test.ts src/campusops/_tests_/remoteResourceParser.test.ts src/campusops/_tests_/securityNegativePaths.test.ts src/campusops/_tests_/incidentNavigation.test.tsx`: salida 1, 3 suites aprobadas/1 fallida; 101 pruebas aprobadas/1 fallida. La única falla fue el timeout de 5000 ms del primer render de navegación. Cliente, parser y seguridad aprobaron.
4. `npm.cmd test -- --ci --runInBand --no-cache src/campusops/_tests_/incidentNavigation.test.tsx`: salida 1; 8 pruebas aprobadas/1 fallida por el mismo timeout. El primer test tardó 19511 ms según Jest.
5. `npm.cmd test -- --ci --runInBand --no-cache --testTimeout=30000 src/campusops/_tests_/incidentNavigation.test.tsx`: salida 0; 9/9 pruebas. Primer test: 23059 ms. No se modificó la prueba ni se suprimieron sus assertions.
6. `npm.cmd test -- --ci --runInBand --no-cache --testTimeout=30000 src/campusops/_tests_ course-tests/public/week-04.test.ts course-tests/public/week-05.test.ts course-tests/public/week-02-architecture.test.ts course-tests/smoke.test.tsx`: salida 0; 10 suites, 124 pruebas aprobadas, 0 fallidas, 0 snapshots. Tiempo informado: 48.655 s. Es la ejecución final de regresión. El límite de 30000 ms es del runner; los casos de timeout del cliente usan reloj falso y timeoutMs=5.
7. `npm.cmd run backend:self-test`: salida 0; `CampusOps backend contracts: roles, reassignment conflict, lost response, idempotency, evidence and geocoding PASS.` y `Controlled backend self-test passed.`
8. `make verify-week-05`: fallo de arranque python3, Error 1920; el evaluador no llegó a ejecutarse.
9. `make public-test-week-05`: mismo fallo de arranque, Error 1920.
10. `make verify-week-05 PYTHON=python3.14`: make salida 1. Evaluador ejecutado: 5 checks estructurales aprobados, 5 comandos npm bloqueados por NVM4306. Resultado conservado en verify.json.
11. `make public-test-week-05 PYTHON=python3.14`: make salida 1, ejecutado antes y después de crear los reportes. Última ejecución: 5 checks estructurales aprobados; falta individual.json; tres commitSha pendientes rechazados por el validador; cuatro comandos npm bloqueados por NVM4306. Resultado conservado en public-tests.json.
12. `make feedback`: salida 1, detenido por NVM4306 en npm run typecheck.
13. `make feedback NPM=npm.cmd`, primer intento: salida 1. Typecheck, lint, smoke (1/1) y audit offline completaron; bundle falló con EPERM al crear C:/Users/oscar/.expo. Make informó Error 7.
14. `npm.cmd run bundle:release`, primer intento: EPERM al crear la carpeta de Expo; no se declaró éxito.
15. `npm.cmd run bundle:release`, reintento con EXPO_OFFLINE y EXPO_NO_TELEMETRY: salida 0; Android exportado en dist/export, 595 módulos, bundle 1.5 MB y metadata.json.
16. `make feedback NPM=npm.cmd`, ejecución final con EXPO_OFFLINE y EXPO_NO_TELEMETRY: salida 0; typecheck, lint, smoke 1/1 y exportación Android completados. Audit en modo offline imprimió `found 0 vulnerabilities`; NO se presenta como consulta actualizada de avisos en Internet.
17. `git diff --check`: salida 0, sin problemas de espacios.
18. Comparación PowerShell de los tres workflows mediante Get-Content y normalización exclusiva del número/nombre semanal: salida 0. Week 04 y Week 05 coinciden línea por línea con Week 03. Ningún workflow modificado.
19. Validación local con `python3.14 -`: JSON legible, campos obligatorios y tipos de scenario/status correctos, alternativas y verificaciones presentes; individual.json ausente. El SHA pendiente NO satisface la validación final y no se ha simulado un SHA real.

Los scripts internos de feedback fueron `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd run test:smoke`, `npm.cmd run audit:ci` y `npm.cmd run bundle:release`. El evaluador intentó los comandos npm que constan completos en sus reportes, incluidos los fallidos.

## Inspección y revisión sin cambios de estado Git

Se usaron `git status --short`, `git branch --show-current`, `git diff --check`, `git diff --stat`, `git diff -- src/campusops/infrastructure/HttpIncidentRepository.ts`; lecturas Get-Content de cliente/parser/puerto/aplicación/errores/telemetría/composición, tests, contratos, reportes, evidencias, package.json, Makefile, evaluador y workflows; búsquedas rg de tests/fetch/contratos e inventario de AGENTS.md (sin coincidencias, salida 1 de rg). Get-Command/Get-ChildItem y lectura de PATH localizaron herramientas instaladas. La búsqueda inicial en Program Files/nodejs no encontró esa ruta; enumerar la raíz del perfil fue denegado; se localizó Node en el directorio NVM ya indicado por PATH. `python --version` falló; `python3.14 --version` y `make --version` identificaron las versiones anteriores. No se modificó el entorno global.

## Estado de entrega

Los reportes de ejecución del evaluador conservaron resultados originales, pero su commitSha se marcó pendiente para no atribuir cambios sin commit al HEAD de Felipe. sourceCheckoutSha registra únicamente la base inspeccionada. Los reportes técnicos y engineering también requieren sustituir su campo commitSha después de disponer del commit técnico y volver a comprobar la entrega. Falta individual.json deliberadamente. La disponibilidad de sesión inicial y actor de la app queda como dependencia del equipo, no se implementó login ni refresh de semanas futuras.
