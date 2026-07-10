# fruit-ms

Microservicio consumidor de eventos de Zarza AI. NestJS 11, sin puertos HTTP públicos: se comunica **únicamente vía RabbitMQ** (salvo un healthcheck interno en `HEALTH_PORT`). Orquesta la llamada al worker de inferencia (`fruit-inference`) y persiste el resultado en PostgreSQL.

Ver también el [README raíz](../README.md) para la arquitectura completa del sistema.

## Responsabilidades

- Consumir el evento `nueva_fruta` publicado por `fruit-backend` (ack manual, reintentos con backoff exponencial, dead-lettering a `fruit.dlx`/`<queue>.dlq` si se agotan los intentos).
- Llamar a `fruit-inference` (`POST /analyze`) para obtener el reporte fenológico.
- Persistir el análisis y sus etapas fenológicas en PostgreSQL (`@rubus/database` / Prisma).
- Responder consultas de solo lectura (`get_fruits`, `get_fruit_by_id`) usadas por `fruit-backend`.
- Notificar a `fruit-backend` (`/internal/notify`) cuando termina un análisis, para que este dispare WebSocket + FCM.

## Stack

NestJS 11 · `@nestjs/microservices` (Transport.RMQ) · `amqp-connection-manager`/`amqplib` · `@nestjs/axios` (llamada HTTP a `fruit-inference` y a `fruit-backend`) · `@rubus/database` (Prisma/PostgreSQL) · `joi` (validación de entorno) · `class-validator`/`class-transformer`.

## Arquitectura interna (Clean Architecture)

```
src/
├── fruits/
│   ├── domain/            # analysis.entity.ts — AnalysisDomain, EtapaFenologica
│   ├── ports/             # analysis-repository.port.ts, inference.port.ts (tokens de DI)
│   ├── infrastructure/     # analysis.prisma.repository.ts, inference-http.adapter.ts, inference.mapper.ts
│   ├── dto/                # analyze-request, analysis-response, nueva-fruta
│   ├── fruits.controller.ts
│   ├── fruits.service.ts
│   └── fruits.module.ts
├── config/                 # envs.ts (Joi), rabbitmq-topology.ts (declaración de DLX/DLQ)
├── database/                # DatabaseModule (re-exporta PrismaDatabaseModule de @rubus/database)
└── health/                  # health.controller.ts (healthcheck interno)
```

## Arranque y transporte (`main.ts`)

Aplicación híbrida: un app HTTP mínimo para el healthcheck (`HEALTH_PORT`) más un microservicio RMQ conectado con `app.connectMicroservice`.

Antes de conectar el microservicio, `setupDeadLetterTopology()` declara `fruit.dlx` y `<queue>.dlq` de forma idempotente (deben existir antes de declarar la cola principal con argumentos DLX que coincidan).

Config de la cola: `Transport.RMQ`, `queue: RABBITMQ_QUEUE`, **`noAck: false`** (ack manual), **`prefetchCount: 5`**, `durable: true` con argumentos dead-letter.

`ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`).

## Patrones de mensajería

| Patrón | Tipo | Comportamiento |
|---|---|---|
| `nueva_fruta` | `EventPattern` | `fruits.controller.ts` reintenta `fruitsService.process(data)` hasta `NUEVA_FRUTA_MAX_ATTEMPTS` veces con backoff (`NUEVA_FRUTA_BACKOFF_BASE_MS * 4^(intento-1)`). Éxito → `channel.ack`; agotados los intentos → `channel.nack(msg, false, false)` (va a la DLQ). |
| `get_fruits` | `MessagePattern` | Lista paginada con filtros (`imageId`, `userId`, rango de fechas, `productorId`, `campoIds`). Ack siempre en `finally`. |
| `get_fruit_by_id` | `MessagePattern` | Busca por `id` o `imageId`; aplica scope por `productorId`/`campoIds`; retorna `null` si no hay match o está fuera de scope. Ack siempre en `finally`. |

## Persistencia

`fruits/infrastructure/analysis.prisma.repository.ts` implementa `IAnalysisRepository` sobre `PrismaService` (transacción que crea `Analysis` + `FenologiaEtapa[]`, y consultas `findMany`/`findFirst`/`count`), mapeando de vuelta a `AnalysisDomain`. Es PostgreSQL, no MongoDB — algún comentario legado en el código todavía menciona "_id de MongoDB"; ignorarlo, la búsqueda real es contra Postgres.

## Variables de entorno (`.env.example`)

```env
# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=ingestion_queue

# Base de datos (compartida con fruit-backend, vía @rubus/database)
DATABASE_URL=postgresql://user:password@localhost:5432/zarza

# fruit-inference
INFERENCE_URL=http://fruit-inference:8000
INFERENCE_AUTH_TOKEN=

# fruit-backend (notificaciones internas al terminar un análisis)
BACKEND_URL=http://fruit-backend:3000
INTERNAL_NOTIFY_TOKEN=

# Health check
HEALTH_PORT=3002

# Reintentos del consumidor nueva_fruta (opcionales)
NUEVA_FRUTA_MAX_ATTEMPTS=3
NUEVA_FRUTA_BACKOFF_BASE_MS=2000
```

> `INTERNAL_NOTIFY_TOKEN` debe coincidir exactamente con el de `fruit-backend/.env`.

## Comandos

```bash
pnpm install
pnpm run start:dev      # Modo desarrollo con watch
pnpm run build          # Compilar TypeScript → dist/
pnpm run lint
pnpm run test           # Unit tests (Jest)
pnpm run test:e2e
pnpm run test:cov
```

Cobertura de tests real en: `fruits.controller` (reintentos/ack/nack), `fruits.service`, `rabbitmq-topology` (declaración DLX/DLQ), `inference-http.adapter`. El e2e (`test/app.e2e-spec.ts`) sigue siendo la plantilla por defecto de Nest, sin adaptar.

## Docker

Build multi-stage desde el contexto raíz del monorepo: instala el workspace completo, ejecuta `pnpm --filter @rubus/database run build` (genera el cliente Prisma) y luego compila `fruit-ms`. El runner hace instalación solo de producción, copia `packages/database/dist` + el cliente Prisma generado y `fruit-ms/dist`, corre como usuario no-root (`node`). No expone puertos públicos en `docker-compose.yml`.
