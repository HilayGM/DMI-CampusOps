# Controles de seguridad y privacidad — Semana 04

## Almacenamiento de sesión implementado

CampusOps persiste únicamente la sesión mínima necesaria: `accessToken`, `refreshToken` y `expiresAt`. El puerto `SecureSessionStore` evita que los perfiles, nombres, ubicaciones, incidencias, fotografías, comentarios internos o datos de la interfaz se agreguen al registro persistente.

`ExpoSecureSessionStore` usa `expo-secure-store`, que delega la protección al almacenamiento seguro del sistema operativo. En iOS se utiliza `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, por lo que el registro no se migra a otro dispositivo mediante una restauración de respaldo. En Android, Expo SecureStore usa el mecanismo seguro proporcionado por la plataforma.

## Amenazas relacionadas

| Amenaza | Control aplicado | Comprobación |
|---|---|---|
| T5: un token aparece en logs o reportes | El adaptador no hace `console.log` ni devuelve el valor serializado al manejar una lectura fallida. | `ExpoSecureSessionStore.test.ts` simula una falla de plataforma y confirma que el resultado es `null`. |
| T6: una credencial queda en una ubicación insegura | Los tokens no se escriben en AsyncStorage ni en el código; se pasan al almacenamiento seguro por un puerto dedicado. | La prueba verifica la llamada a SecureStore y que sólo se serializan los tres campos mínimos. |
| T3/T4: datos de perfil o ubicación permanecen donde no son necesarios | `copySession` reconstruye el objeto permitido, por lo que propiedades adicionales no se persisten. | La prueba agrega un nombre ficticio y confirma que no queda en el valor almacenado. |

## Alternativas y decisión

Se eligió Expo SecureStore en lugar de AsyncStorage porque los tokens de sesión son secretos y necesitan la protección nativa de iOS/Android. También se consideró no persistir ninguna sesión: reduce superficie de exposición, pero obliga a autenticar en cada inicio y no cumple el caso de recuperación de sesión. Mantener un objeto completo de usuario dentro de SecureStore también fue descartado por minimización de datos: un almacén cifrado no justifica conservar información que la app no necesita recuperar.

## Riesgo residual

Un dispositivo desbloqueado, comprometido o con una sesión activa todavía puede permitir el uso de la aplicación. SecureStore tampoco evita que otro código registre un token antes de enviarlo al adaptador; esa protección corresponde al sanitizador de telemetría y a las pruebas negativas del equipo. El backend didáctico continúa usando fixtures y no representa una autenticación de producción.
