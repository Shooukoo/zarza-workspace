# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zarza AI** — Plataforma de agricultura de precisión para análisis fenológico de frutos de zarzamora mediante visión computacional. Arquitectura de microservicios con procesamiento asíncrono vía RabbitMQ. Monorepo con pnpm workspaces para los paquetes TypeScript (`fruit-backend`, `fruit-ms`, `packages/database`); `fruit-inference` (Python) y `zarza-web` (npm) están fuera del workspace pnpm.

## Services

| Servicio | Stack | Puerto | Rol |
|---------|-------|--------|-----|
| `fruit-backend` | NestJS 11 + Fastify + TypeScript | 3001→3000 | API pública REST (`/api/v1`) + WebSocket (`/ws`) |
| `fruit-ms` | NestJS 11 + TypeScript | RMQ only (health interno 3002) | Consumidor de eventos (interno) |
| `fruit-inference` | Python 3.11 + FastAPI + YOLOv8 | 8000 (solo `127.0.0.1`) | Inferencia IA (interno) |
| `zarza-web` | React 18 + Vite + TypeScript + antd | 5173 | Dashboard web (admin/productor/agrónomo/monitor) |
| `zarza_ai` | Flutter 3 + Dart | Mobile | App móvil |
| `packages/database` | Prisma 6 + PostgreSQL | — | Cliente de datos compartido (`@rubus/database`) |

Infra: **PostgreSQL 16** (imagen `postgis/postgis`, pero el schema actual solo usa `Float` para lat/lng, sin geometría PostGIS), **RabbitMQ 3**, **Redis 7** (cache del dashboard de `fruit-backend`).

## Commands

### fruit-backend / fruit-ms (pnpm workspace)
```bash
pnpm run start:dev      # Modo desarrollo con watch
pnpm run build          # Compilar TypeScript → dist/
pnpm run lint           # ESLint con auto-fix
pnpm run format         # Prettier
pnpm run test           # Unit tests (Jest)
pnpm run test:watch     # Tests en modo watch
pnpm run test:e2e       # Tests E2E
pnpm run test:cov       # Cobertura
pnpm run seed:admin     # Seed usuario administrador (solo fruit-backend)

# Un solo archivo o test puntual (Jest)
pnpm exec jest path/to/file.spec.ts
pnpm exec jest path/to/file.spec.ts -t "nombre del test"

# Desde la raíz del monorepo, filtrando por paquete
pnpm --filter fruit-backend run start:dev
pnpm --filter fruit-ms run test
```

### packages/database (Prisma)
```bash
pnpm run generate        # prisma generate → src/generated/client
pnpm run migrate:dev --name <descripcion>   # crea/aplica migración en desarrollo
pnpm run migrate:deploy  # aplica migraciones pendientes (prod/CI)
pnpm run studio          # explorador visual de datos
```
Tras editar `prisma/schema.prisma`, hay que correr `migrate:dev` y reconstruir las imágenes Docker de `fruit-backend`/`fruit-ms` (compilan `@rubus/database` como paso previo; un cliente Prisma desactualizado no se recoge sin rebuild).

### fruit-inference (Python)
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pytest                                    # todos los tests
pytest tests/test_auth.py                 # un archivo
pytest tests/test_auth.py -k "test_name"  # un test puntual
```

### zarza-web (npm)
```bash
npm install
npm run dev       # Vite dev server, puerto 5173
npm run build     # tsc -b && vite build
```

### zarza_ai (Flutter)
```bash
flutter pub get
flutter run --flavor dev      # dev/staging/prod controlan applicationId + URLs backend
flutter test
flutter test test/path/al/archivo_test.dart   # un solo archivo
flutter build apk --flavor prod --release
```
`flutter run` sin `--flavor` falla en Android a propósito (obliga a elegir entorno). Web y Windows no soportan `--flavor` y siempre corren como dev.

### Stack completo con Docker
```bash
docker compose up --build              # Levanta todos los servicios
docker compose up postgres rabbitmq redis   # Solo infraestructura (para dev local)
```

## Architecture

### Flujo principal
1. **zarza_ai** / **zarza-web** sube imagen → `fruit-backend` (`POST /api/v1/ingestion/upload`, multipart)
2. `fruit-backend` sube la imagen a Cloudflare R2, publica evento `nueva_fruta` en RabbitMQ
3. `fruit-ms` consume `nueva_fruta` (ack manual, prefetch 5), llama a `fruit-inference` (HTTP síncrono, con reintentos)
4. `fruit-inference` descarga imagen de R2, preprocesa (balance de blancos + CLAHE), ejecuta YOLOv8, devuelve análisis estructurado (7 etapas fenológicas, peso, merma, fecha cosecha)
5. `fruit-ms` persiste resultados en **PostgreSQL** vía `@rubus/database` (Prisma)
6. `fruit-ms` llama a `fruit-backend` (`POST /api/v1/internal/notify`, token compartido) → `fruit-backend` notifica en tiempo real vía WebSocket (`/ws`) y push FCM al cliente

### Patrones de mensajería (RabbitMQ)
- `nueva_fruta` — EventPattern (fire-and-forget). Payload real (`NuevaFrutaDto`): `{ image_id, storage_key, userId?, userEmail?, metadata: { capturedAt, processedAt, size_bytes }, status: 'UPLOADED', campoId?, productorId?, gpsLat?, gpsLon?, offlineSyncId? }`
- `get_fruits` — MessagePattern (request-reply): filtros paginados (`imageId`, `userId`, rango de fechas, `productorId`, `campoIds`)
- `get_fruit_by_id` — MessagePattern (request-reply): busca por `id` o `imageId`, con scope por `productorId`/`campoIds`

Resiliencia: `nueva_fruta` se consume con ack manual (`noAck: false`, prefetch 5), reintentos con backoff exponencial base 4 (`NUEVA_FRUTA_MAX_ATTEMPTS`/`NUEVA_FRUTA_BACKOFF_BASE_MS`, defaults 3/2000ms) y dead-lettering a `fruit.dlx` → `<queue>.dlq` cuando se agotan. La cola se declara con argumentos DLX que deben coincidir siempre entre productor y consumidor (ver sección DLQ en el README raíz para el procedimiento de migración de una cola ya existente).

### fruit-backend — Estructura por módulos (Clean Architecture en `auth/`, resto por feature)
```
auth/            ports/ domain/ application/ infrastructure/ — JWT access+refresh con rotación, guards, RBAC
admin/           ← CRUD usuarios, asignación de campos, /admin/stats, dashboard (cacheado en Redis)
analyses/        ← consulta de análisis, URLs de imagen, validación por Agrónomo (Human-in-the-Loop)
ingestion/       ← upload a R2 + publicación RabbitMQ ("nueva_fruta")
fruits-query/    ← read-side queries de solo lectura, scope por rol
campos/          ← gestión de campos/fincas
solicitudes/     ← tareas de muestreo
notifications/   ← bandeja de notificaciones + WebSocket gateway + internal-notify.controller (consumido por fruit-ms)
fcm/             ← envío de push (Firebase Admin)
cache/           ← RedisCacheService
storage/         ← abstracción cliente S3/R2 (URLs firmadas)
```
Persistencia vía `@rubus/database` (Prisma/PostgreSQL) inyectado como módulo de Nest, no Mongoose.

### fruit-ms — Estructura (Clean Architecture en `fruits/`)
```
fruits/
  domain/           ← AnalysisDomain, EtapaFenologica
  ports/            ← analysis-repository.port, inference.port (tokens de DI)
  infrastructure/   ← analysis.prisma.repository.ts (Prisma), inference-http.adapter.ts, inference.mapper.ts
  fruits.controller.ts / fruits.service.ts / fruits.module.ts
config/             ← envs.ts (Joi), rabbitmq-topology.ts (declara fruit.dlx + <queue>.dlq de forma idempotente)
database/           ← re-exporta DatabaseModule de @rubus/database
health/             ← healthcheck interno (HEALTH_PORT)
```
Nota: algún comentario legado en el código todavía dice "_id de MongoDB" — es texto obsoleto, la búsqueda real es contra PostgreSQL.

### fruit-inference — Estructura
```
domain/           ← lógica de negocio (analysis.py: build_report; weight.py: estimación visual de peso)
infrastructure/   ← auth.py (valida x-inference-token), r2_client.py, yolo_client.py, image_preprocessor.py
model_config.py   ← CLASS_MAP (peso_g, etapa), DIAS_PREDICCION, VARIEDADES_SOPORTADAS
main.py           ← FastAPI + lifespan (modelo YOLO cargado una vez al inicio)
```
`best.pt` no se copia en la imagen Docker: se monta como volumen de solo lectura (`docker-compose.yml`), debe existir en `fruit-inference/best.pt` antes de levantar el stack.

### zarza-web — Estructura (por feature, no por capa)
```
admin/        ← gestión de usuarios (solo ADMIN)
analisis/     ← listado/detalle de análisis
campos/       ← CRUD de campos y asignación de agrónomos/monitores
dashboard/    ← gráficas de producción (recharts)
solicitudes/  ← solicitudes de muestreo
auth/         ← AuthContext, PrivateRoute, Role enum, landing por rol
shared/       ← AppShell (layout + WebSocket), páginas 403/404
api/client.ts ← axios único, baseURL '/api/v1', auth por cookie (withCredentials), redirige a /login en 401
```
Rutas protegidas por rol en `App.tsx` (ver README de `zarza-web` para la tabla completa). Auth por cookie httpOnly, no hay token en `localStorage`.

### zarza_ai — Clean Architecture (Flutter BLoC)
```
domain/           ← entidades y casos de uso
data/             ← repositorios y datasources (remote/local, caché offline SQLite)
presentation/     ← BLoCs, pantallas UI
core/             ← utilidades, constantes, DI con GetIt, env_config.dart (resuelve URLs por flavor)
```

### packages/database — Cliente Prisma compartido
`@rubus/database` centraliza `prisma/schema.prisma`, las migraciones y `PrismaService`; es la única fuente de acceso a datos — ni `fruit-backend` ni `fruit-ms` declaran su propio cliente. Modelos: `User`, `Campo`, `UserCampo`, `SolicitudMuestreo`, `Analysis`, `FenologiaEtapa`, `RefreshToken`, `Notification`. El cliente generado vive en `src/generated/client` y se re-exporta desde `index.ts`.

## Environment Variables

Cada servicio tiene su propio `.env` (ver `.env.example` de cada uno para el detalle completo).

**fruit-backend/.env**: `R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`, `RABBITMQ_URL`/`RABBITMQ_QUEUE`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `INTERNAL_NOTIFY_TOKEN` (compartido con fruit-ms), `FCM_TOKEN_ENCRYPTION_KEY`, `FIREBASE_SERVICE_ACCOUNT_B64`, `CORS_ORIGIN`, `PORT`, más `DATABASE_URL` (Postgres) y `REDIS_URL` inyectadas normalmente por `docker-compose.yml`.

**fruit-ms/.env**: `RABBITMQ_URL`/`RABBITMQ_QUEUE`, `DATABASE_URL` (Postgres, compartida con fruit-backend vía `@rubus/database`), `INFERENCE_URL`, `INFERENCE_AUTH_TOKEN`, `BACKEND_URL`, `INTERNAL_NOTIFY_TOKEN` (debe coincidir con el de fruit-backend), `HEALTH_PORT`, `NUEVA_FRUTA_MAX_ATTEMPTS`, `NUEVA_FRUTA_BACKOFF_BASE_MS`.

**fruit-inference/.env**: `MODEL_PATH` (ruta a `best.pt`), `CONF_THRESHOLD`, credenciales R2 (`R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET_NAME`), `CLAHE_CLIP_LIMIT`/`CLAHE_TILE_SIZE`, `PREPROCESSING_DEBUG`, `INFERENCE_AUTH_TOKEN` (obligatorio, el módulo lanza `RuntimeError` al importarse si falta), `MAX_IMAGE_SIZE_MB`.

**zarza-web**: sin `.env`; solo `VITE_API_TARGET` (proxy de Vite en desarrollo, default `http://localhost:3001`).

**packages/database/.env**: `DATABASE_URL` (Postgres).

> El archivo `fruit-inference/best.pt` (modelo YOLOv8, ~22 MB) debe existir antes de levantar el stack; se monta como volumen, no se copia en la imagen.

## Key Conventions

- **Roles RBAC**: `ADMIN`, `PRODUCTOR`, `AGRONOMO`, `MONITOR`
- **Rate limiting**: `ThrottlerGuard` global 1000 req/60s + límite dedicado 10 req/min para `auth`
- **Sincronización offline**: campo `offlineSyncId` con constraint único en PostgreSQL (`Analysis.offlineSyncId`) previene duplicados al sincronizar
- **Geolocalización**: `Analysis.ubicacionLat`/`ubicacionLng` son `Float` simples; no hay índice geoespacial ni tipos PostGIS pese a que la imagen de la base de datos es `postgis/postgis`
- **Docker**: imágenes multi-stage con usuario no-root (`node`); los Dockerfile de `fruit-backend`/`fruit-ms` compilan `packages/database` (Prisma) como paso previo, con contexto de build en la raíz del monorepo; `fruit-inference` solo accesible en red interna Docker
- **Tests**: cobertura unitaria real (no plantillas) en `fruit-backend` (auth, admin, fcm, notifications, solicitudes, storage, cache), `fruit-ms` (fruits controller/service, rabbitmq-topology, inference-http.adapter) y `fruit-inference` (auth, r2_client, image_preprocessor); los e2e siguen siendo plantillas mínimas sin ampliar
- **Auth entre servicios**: `INTERNAL_NOTIFY_TOKEN` (fruit-ms → fruit-backend) e `INFERENCE_AUTH_TOKEN` (fruit-ms → fruit-inference) son tokens estáticos compartidos, no JWT de usuario; ver rotación en `SECURITY.md`
- **zarza-web** usa autenticación por cookie httpOnly (`withCredentials`), no guarda tokens en `localStorage`
