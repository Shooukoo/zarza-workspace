# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Zarza AI** — Plataforma de agricultura de precisión para análisis fenológico de frutos mediante visión computacional. Arquitectura de microservicios con procesamiento asíncrono vía RabbitMQ.

## Services

| Servicio | Stack | Puerto | Rol |
|---------|-------|--------|-----|
| `fruit-backend` | NestJS 11 + Fastify + TypeScript | 3001 | API pública REST + WebSocket |
| `fruit-ms` | NestJS 11 + TypeScript | RMQ only | Consumidor de eventos (interno) |
| `fruit-inference` | Python 3 + FastAPI + YOLOv8 | 8000 | Inferencia IA (interno) |
| `zarza_ai` | Flutter 3 + Dart | Mobile | App móvil |

## Commands

### fruit-backend / fruit-ms (pnpm)
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
```

### fruit-inference (Python)
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### zarza_ai (Flutter)
```bash
flutter pub get
flutter run -d <device>
flutter test
flutter build apk
```

### Stack completo con Docker
```bash
docker compose up --build          # Levanta todos los servicios
docker compose up mongo rabbitmq   # Solo infraestructura (para dev local)
```

## Architecture

### Flujo principal
1. **zarza_ai** sube imagen → `fruit-backend` (REST `POST /ingestion`)
2. `fruit-backend` almacena imagen en Cloudflare R2, publica evento `nueva_fruta` en RabbitMQ
3. `fruit-ms` consume `nueva_fruta`, llama a `fruit-inference` (HTTP síncrono)
4. `fruit-inference` descarga imagen de R2, ejecuta YOLOv8, devuelve análisis estructurado (7 etapas fenológicas, peso, merma, fecha cosecha)
5. `fruit-ms` persiste resultados en MongoDB
6. `fruit-backend` notifica en tiempo real vía WebSocket al cliente Flutter

### Patrones de mensajería (RabbitMQ)
- `nueva_fruta` — EventPattern (fire-and-forget): `{ image_id, storage_key, campo_id, productor_id, ubicacion_gps, offline_sync_id }`
- `get_fruits` — MessagePattern (request-reply): filtros paginados
- `get_fruit_by_id` — MessagePattern (request-reply): `{ _id }`

### fruit-backend — Estructura por módulos (Clean Architecture)
```
auth/
  ports/          ← interfaces (HasherPort, TokenPort, UserRepositoryPort)
  domain/         ← entidades, enums (Role), errores de dominio
  application/    ← AuthService
  infrastructure/ ← adaptadores bcrypt/JWT/Mongoose, guards, controllers
ingestion/        ← upload a R2 + publicación RabbitMQ
fruits-query/     ← read-side queries vía RMQ MessagePattern
admin/            ← gestión de usuarios y solicitudes
campos/           ← gestión de campos/fincas
solicitudes/      ← tareas de muestreo
notifications/    ← WebSocket gateway
storage/          ← abstracción cliente S3/R2
```

### fruit-inference — Estructura
```
domain/           ← lógica de negocio (analysis.py, weight.py)
infrastructure/   ← clientes externos (r2_client.py, yolo_client.py)
main.py           ← FastAPI + lifespan (modelo cargado una vez al inicio)
```

### zarza_ai — Clean Architecture (Flutter BLoC)
```
domain/           ← entidades y casos de uso
data/             ← repositorios y datasources (remote/local)
presentation/     ← BLoCs, pantallas UI
core/             ← utilidades, constantes, DI con GetIt
```

## Environment Variables

Cada servicio tiene su propio `.env`. Variables clave:

**fruit-backend/.env**: `MONGO_URI`, `JWT_SECRET`, `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RABBITMQ_URL`, `FCM_SERVER_KEY`

**fruit-ms/.env**: `RABBITMQ_URL`, `INFERENCE_URL` (URL interna de fruit-inference), `MONGO_URI`

**fruit-inference/.env**: `MODEL_PATH` (ruta a `best.pt`), credenciales R2, `CONF_THRESHOLD`

> El archivo `fruit-inference/best.pt` (modelo YOLOv8, ~6.5MB) debe existir antes del build Docker.

## Key Conventions

- **Roles RBAC**: `ADMIN`, `PRODUCTOR`, `AGRONOMO`, `MONITOR`
- **Rate limiting**: 1000 req/60s globalmente vía `ThrottlerGuard`
- **Sincronización offline**: campo `offline_sync_id` con índice sparse único en MongoDB previene duplicados al sincronizar
- **Índice geoespacial**: `ubicacion_gps` en collection `analyses` es índice 2dsphere para queries geográficas
- **Docker**: imágenes multi-stage con usuario no-root (`user: node`); `fruit-inference` solo accesible en red interna Docker
- **Tests**: los specs E2E existen como plantilla; los tests unitarios están pendientes de implementar
