# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

Si encuentras una vulnerabilidad de seguridad en Zarza AI, por favor
repórtala de forma responsable siguiendo estos pasos:

1. **No abras un Issue público** con detalles de la vulnerabilidad.
2. Envía un correo a **[santaigo.amn@hotmail.com]** con el asunto:
   `[SECURITY] Zarza AI - Descripción breve`.
3. Incluye en tu reporte:
   - Descripción del problema y su posible impacto.
   - Pasos para reproducirlo.
   - Versión afectada del sistema.

Recibirás una respuesta en un plazo máximo de **7 días hábiles**.
Si la vulnerabilidad es confirmada, se trabajará en un parche y
se te notificará antes de hacer cualquier divulgación pública.

Este proyecto es desarrollado con fines académicos. Las áreas de
mayor sensibilidad son la autenticación JWT, el control de acceso
RBAC y las credenciales de Cloudflare R2 y PostgreSQL.

## Rotación de secretos internos

### `INTERNAL_NOTIFY_TOKEN`

Token compartido entre `fruit-ms` (cliente) y `fruit-backend` (endpoint
`POST /api/v1/internal/notify`). Ambos servicios lo leen de su `.env`
(nunca versionar `.env`; los `.gitignore` ya lo excluyen). Toda llamada
al endpoint queda registrada en los logs de `fruit-backend` con evento
e IP de origen (`ip=` conexión directa, `xff=` header `x-forwarded-for`
si hay proxy), incluidos los intentos con token inválido.

**Proceso de rotación (automatizado):**

```bash
scripts/rotate-secret.sh INTERNAL_NOTIFY_TOKEN fruit-backend fruit-ms
```

El script genera un valor nuevo, actualiza el `.env` de ambos servicios (con
backup automático), redespliega los contenedores afectados y verifica que
el healthcheck vuelva a reportar `healthy` y que no haya rechazos de token
en los logs recientes de `fruit-backend`. Si algo falla, el script termina
con error y deja el backup del `.env` viejo (`fruit-backend/.env.bak-<timestamp>`,
`fruit-ms/.env.bak-<timestamp>`) para revertir a mano.

**Cadencia recomendada:** cada 90 días, o de inmediato ante cualquier
sospecha de filtración.

**Mejora futura:** migrar `JWT_SECRET`, credenciales R2 y otros secretos
estáticos a un gestor de secretos externo (HashiCorp Vault, AWS Secrets
Manager) en lugar de variables de entorno planas. La rotación automática
de los tokens compartidos arriba ya está implementada; esta mejora
cubriría secretos de infraestructura además de simplificar la rotación.

### `INFERENCE_AUTH_TOKEN`

Token compartido entre `fruit-ms` (cliente de `POST /analyze`) y
`fruit-backend` (cliente de `POST /internal/prepare-restart`, al promover un
modelo) por un lado, y `fruit-inference` (endpoint, header
`x-inference-token`) por el otro. `fruit-inference` no arranca sin este
valor configurado (`infrastructure/auth.py` lanza `RuntimeError` al
importarse si falta).

**Proceso de rotación (automatizado):**

```bash
scripts/rotate-secret.sh INFERENCE_AUTH_TOKEN fruit-ms fruit-backend fruit-inference
```

El script genera un valor nuevo, actualiza el `.env` de ambos servicios (con
backup automático), redespliega los contenedores afectados y verifica que
el healthcheck vuelva a reportar `healthy` y que no haya rechazos de token
en los logs recientes de `fruit-backend`. Si algo falla, el script termina
con error y deja el backup del `.env` viejo para revertir a mano.

*Nota: La verificación automática de logs no aplica hoy para este token
porque `fruit-inference` no loguea el rechazo de token todavía. Confirmá
manualmente con un uso real (ej. disparar una inferencia) antes de borrar
el backup.*

**Cadencia recomendada:** la misma que `INTERNAL_NOTIFY_TOKEN` (cada 90
días, o de inmediato ante sospecha de filtración).

### `TRAINING_INTERNAL_TOKEN`

Token compartido entre `fruit-backend` y `fruit-training`, usado en ambos
sentidos: `fruit-backend` lo envía en `POST /train` (header
`x-training-token`), y `fruit-training` lo envía en
`GET /internal/training/dataset` y `POST /internal/training-complete`.

**Proceso de rotación (automatizado):**

```bash
scripts/rotate-secret.sh TRAINING_INTERNAL_TOKEN fruit-backend fruit-training
```

El script genera un valor nuevo, actualiza el `.env` de ambos servicios (con
backup automático), redespliega los contenedores afectados y verifica que
el healthcheck vuelva a reportar `healthy` y que no haya rechazos de token
en los logs recientes de `fruit-backend`. Si algo falla, el script termina
con error y deja el backup del `.env` viejo para revertir a mano.

*Nota: La verificación automática de logs no aplica hoy para este token
porque `fruit-training` no loguea el rechazo de token todavía. Confirmá
manualmente con un uso real (ej. revisar el flujo de entrenamiento) antes
de borrar el backup.*

**Cadencia recomendada:** la misma que `INTERNAL_NOTIFY_TOKEN`/`INFERENCE_AUTH_TOKEN`
(cada 90 días, o de inmediato ante sospecha de filtración).

### `FCM_TOKEN_ENCRYPTION_KEY`

Clave de cifrado simétrico (AES-256-GCM) usada por `fruit-backend` para
cifrar el campo `fcmToken` de cada usuario antes de guardarlo en Postgres.
A diferencia de los tokens compartidos de arriba, rotarla **también
re-encripta los datos ya guardados** — no alcanza con cambiar la variable
de entorno y redesplegar, porque los tokens ya cifrados con la clave vieja
dejarían de poder desencriptarse.

**Proceso de rotación (automatizado):**

```bash
# 1. Dry-run: cuántos tokens se re-encriptarían, sin escribir nada.
pnpm --filter fruit-backend run rotate:fcm-key

# 2. Ejecutar de verdad.
pnpm --filter fruit-backend run rotate:fcm-key -- --apply
```

El script lee todos los `fcmToken` no nulos, desencripta cada uno con la
clave vieja (o los toma tal cual si están en texto plano legado — esto
resuelve el backfill pendiente en la misma pasada), y los re-encripta con
una clave nueva dentro de una transacción de base de datos. Si cualquier
fila falla, la transacción entera revierte y no se toca `fruit-backend/.env`
ni se redespliega — la base de datos queda consistente con la clave vieja.
Solo si la transacción completa sin errores, el script actualiza
`FCM_TOKEN_ENCRYPTION_KEY` en `fruit-backend/.env` (con backup) y
redespliega `fruit-backend`.

**Cadencia recomendada:** la misma que los demás secretos (cada 90 días, o
de inmediato ante sospecha de filtración).
