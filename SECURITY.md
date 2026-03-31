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
RBAC y las credenciales de Cloudflare R2 y MongoDB.
