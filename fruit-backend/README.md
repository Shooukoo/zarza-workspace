# fruit-backend

API Gateway del sistema Zarza AI. NestJS 11 sobre Fastify, expone la API REST pública (`/api/v1`) y el canal WebSocket (`/ws`) usados por la app móvil (`zarza_ai`) y el dashboard web (`zarza-web`). Es el único servicio del monorepo con puertos accesibles desde fuera de la red Docker interna (además de `fruit-inference`, que solo se expone en `127.0.0.1`).

Ver también el [README raíz](../README.md) para la arquitectura completa del sistema.

## Responsabilidades

- Autenticación y sesiones (JWT de acceso + refresh con rotación).
- Ingesta de imágenes (`multipart/form-data`) y subida a Cloudflare R2.
- Publicación del evento `nueva_fruta` en RabbitMQ para que `fruit-ms` dispare el análisis.
- Lectura de análisis, campos, usuarios y solicitudes de muestreo (persistidos en PostgreSQL vía `@rubus/database`).
- Notificaciones en tiempo real: WebSocket (`NotificationsGateway`) + push FCM, incluyendo un endpoint interno protegido por token que consume `fruit-ms` para avisar resultados de análisis.
- Cache de las métricas del dashboard con Redis.

## Stack

NestJS 11 · Fastify 5 (`@fastify/helmet`, `@fastify/cookie`, `@fastify/multipart`) · `@nestjs/platform-ws` · `@nestjs/throttler` · `@nestjs/jwt` · `bcrypt` · `@aws-sdk/client-s3` (Cloudflare R2) · `amqp-connection-manager`/`amqplib` (RabbitMQ) · `ioredis` (Redis) · `firebase-admin` (FCM) · `@rubus/database` (Prisma/PostgreSQL) · `joi` (validación de entorno).

## Estructura del código (por módulo)

```
src/
├── auth/            # application/domain/infrastructure/ports — login, refresh, logout, guards, JWT strategy
├── admin/            # CRUD de usuarios, asignación de campos, /admin/stats, dashboard (yield/health/phenology)
├── analyses/         # Consulta de análisis, URLs de imagen, flujo de validación del Agrónomo
├── campos/           # CRUD de campos, listados con scope por rol
├── ingestion/        # Upload multipart, publica "nueva_fruta" vía ClientProxy (RabbitMQ)
├── fruits-query/     # Consultas de solo lectura del resultado de ingestión, con scope por rol
├── solicitudes/      # Solicitudes de muestreo: crear/listar/actualizar estado
├── notifications/    # Bandeja de notificaciones + internal-notify.controller (consumido por fruit-ms)
├── fcm/               # Envío de notificaciones push (Firebase Cloud Messaging)
├── cache/             # RedisCacheService (cache del dashboard)
├── storage/           # Adaptador S3/R2 + generación de URLs firmadas
├── health/            # /health (sin auth, excluido del throttling)
├── common/            # DTOs compartidos (paginación, etc.)
└── config/            # Carga y validación (Joi) de variables de entorno
```

## Configuración global (`main.ts` / `app.module.ts`)

- Adaptador **Fastify**, prefijo global `api`, versionado por URI (`v1`) → rutas bajo `/api/v1/...`.
- `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).
- `@fastify/helmet` + `@fastify/cookie` + CORS restringido a `CORS_ORIGIN`.
- WebSocket nativo (`WsAdapter`) para `NotificationsGateway`, ruta `/ws`.
- `ThrottlerModule` global (`APP_GUARD`): límite `global` 1000 req/min y límite dedicado `auth` 10 req/min.
- No expone Swagger/OpenAPI.

## Endpoints principales

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `ADMIN` | Crea un nuevo usuario. |
| `POST` | `/api/v1/auth/login` | Público | Login, setea cookies + retorna tokens. |
| `POST` | `/api/v1/auth/refresh` | Público (cookie) | Rota el refresh token. |
| `POST` | `/api/v1/auth/logout` | Autenticado | Revoca el refresh token. |
| `POST` | `/api/v1/ingestion/upload` | Autenticado | Sube imagen, publica `nueva_fruta`. Retorna `image_id`, `storage_key`, `status`. |
| `GET` | `/api/v1/fruits` | Autenticado | Lista paginada de resultados de ingestión (scope por rol). |
| `GET` | `/api/v1/analyses` / `/api/v1/analyses/:id` | Autenticado | Análisis completo, con posibilidad de validación por Agrónomo. |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/v1/admin/users*` | `ADMIN` | Gestión de usuarios y asignación de campos. |
| `GET` | `/api/v1/admin/stats` | `ADMIN`/`PRODUCTOR` | Métricas agregadas del dashboard (cacheadas en Redis). |
| `GET`/`POST`/`DELETE` | `/api/v1/campos*` | Según rol | CRUD de campos. |
| `GET`/`POST`/`PATCH` | `/api/v1/solicitudes*` | Según rol | Solicitudes de muestreo. |
| `GET`/`PATCH`/`DELETE` | `/api/v1/notifications*` | Autenticado | Bandeja de notificaciones del usuario. |
| `POST` | `/api/v1/internal/notify` | Token interno (no JWT) | Usado por `fruit-ms` para disparar WS + FCM + persistencia al terminar un análisis. |
| `GET` | `/api/v1/health` | Público | Healthcheck (usado por Docker). |

## Variables de entorno

`.env.example` incluye las específicas de este servicio; la conexión a base de datos (`DATABASE_URL`, PostgreSQL) la define `packages/database` y se inyecta vía `docker-compose.yml` / entorno local:

```env
# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=ingestion_queue

# Auth
JWT_SECRET=tu_clave_secreta_minimo_32_caracteres
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Notificación interna compartida con fruit-ms (mínimo 32 chars, generar con `openssl rand -hex 32`)
INTERNAL_NOTIFY_TOKEN=

# Cifrado de datos sensibles (clave AES-256 en base64, generar con `openssl rand -base64 32`)
FCM_TOKEN_ENCRYPTION_KEY=

# Firebase (FCM), servido como service account en base64
FIREBASE_SERVICE_ACCOUNT_B64=

# Servidor
PORT=3000
CORS_ORIGIN=http://localhost:5173

# Infraestructura (normalmente inyectadas por docker-compose)
DATABASE_URL=postgresql://rubus:rubus_dev@localhost:5433/rubusai
REDIS_URL=redis://localhost:6379
```

> `INTERNAL_NOTIFY_TOKEN` debe coincidir exactamente con el mismo valor en `fruit-ms/.env`. Ver rotación de secretos internos en [SECURITY.md](../SECURITY.md).

## Comandos

```bash
pnpm install
pnpm run start:dev      # Modo desarrollo con watch
pnpm run build          # Compilar TypeScript → dist/
pnpm run lint           # ESLint con auto-fix
pnpm run format         # Prettier
pnpm run test           # Unit tests (Jest)
pnpm run test:e2e       # Tests E2E (plantilla mínima, pendiente de ampliar)
pnpm run test:cov       # Cobertura
pnpm run seed:admin     # Seed usuario administrador
```

Cobertura de tests real (no plantillas) en: `auth` (servicio y repositorios), `admin`/`admin-dashboard`, `fcm`, `notifications` (gateway + internal-notify), `solicitudes`, `storage`, `cache`, DTOs de paginación.

## Docker

Build multi-stage (`builder` + `runner`) desde el contexto raíz del monorepo (necesita `packages/database` para generar el cliente Prisma antes de compilar). Corre como usuario no-root (`node`). Puerto interno `3000`, expuesto como `3001` en `docker-compose.yml`.
