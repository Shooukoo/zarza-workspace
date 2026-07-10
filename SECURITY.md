# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

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

**Proceso de rotación (manual):**

1. Generar un nuevo valor: `openssl rand -hex 32` (mínimo 32 caracteres).
2. Actualizar `INTERNAL_NOTIFY_TOKEN` en el `.env` de **ambos**
   servicios (`fruit-backend` y `fruit-ms`); los valores deben coincidir.
3. Redesplegar/reiniciar ambos servicios (idealmente juntos, ej.
   `docker compose up -d --build fruit-backend fruit-ms`). Las
   notificaciones que fallen durante la ventana de despliegue no son
   críticas: `fruit-ms` no reintenta y la app móvil hace polling.
4. Verificar en los logs de `fruit-backend` que las llamadas a
   `/internal/notify` vuelven a responder 204 (sin warnings de token
   inválido).

**Cadencia recomendada:** cada 90 días, o de inmediato ante cualquier
sospecha de filtración.

**Mejora futura:** migrar este y otros secretos estáticos (`JWT_SECRET`,
credenciales R2) a un gestor de secretos (HashiCorp Vault, AWS Secrets
Manager) en lugar de variables de entorno planas.

### `INFERENCE_AUTH_TOKEN`

Token compartido entre `fruit-ms` (cliente) y `fruit-inference` (endpoint
`POST /analyze`, header `x-inference-token`). `fruit-inference` no arranca
sin este valor configurado (`infrastructure/auth.py` lanza `RuntimeError`
al importarse si falta).

**Proceso de rotación (manual):**

1. Generar un nuevo valor: `openssl rand -hex 32`.
2. Actualizar `INFERENCE_AUTH_TOKEN` en el `.env` de **ambos** servicios
   (`fruit-ms` y `fruit-inference`); los valores deben coincidir.
3. Redesplegar/reiniciar ambos servicios juntos, ej.
   `docker compose up -d --build fruit-ms fruit-inference`.
4. Verificar que `POST /analyze` vuelve a responder `200` y que no hay
   `401` por token inválido en los logs de `fruit-inference`.

**Cadencia recomendada:** la misma que `INTERNAL_NOTIFY_TOKEN` (cada 90
días, o de inmediato ante sospecha de filtración).
