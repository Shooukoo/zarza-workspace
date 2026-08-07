# Cache Redis para métricas de admin — Diseño

**Plan relacionado:** [[2026-07-08-redis-dashboard-cache]]

**Fecha:** 2026-07-08
**Alcance:** `fruit-backend` — endpoints `GET /admin/dashboard/yield`, `GET /admin/dashboard/health`, `GET /admin/dashboard/phenology` y `GET /admin/stats`.

## Problema

Las métricas del dashboard de administración se calculan con agregaciones sobre Postgres (`$queryRaw` con JOIN + GROUP BY sobre `fenologia_etapas`/`analyses`, y `aggregate` sobre `analyses`) en cada request. `GET /admin/stats` hace un `groupBy` sobre usuarios en cada request. Con el panel web abierto estos endpoints se consultan repetidamente y el costo es innecesario porque los datos cambian solo cuando llega un análisis nuevo (dashboard) o cuando se mutan usuarios (stats).

## Decisiones

1. **Estrategia de frescura:** TTL corto (300 s) como red de seguridad + invalidación inmediata por evento.
2. **Alcance:** los 3 endpoints de `dashboard/*` y además `GET /admin/stats`.
3. **Implementación:** servicio propio con `ioredis` (no `@nestjs/cache-manager`), usado explícitamente desde los services. Encaja con el estilo ports/adapters del proyecto y hace trivial la invalidación por evento y el keying por `productorId`.

## Infraestructura

- Nuevo servicio en `docker-compose.yml`:
  - Imagen `redis:7-alpine`.
  - Healthcheck: `redis-cli ping`.
  - Solo red interna `fruit-net`; puerto `127.0.0.1:6379` expuesto únicamente para desarrollo local.
- `fruit-backend`:
  - Variable de entorno `REDIS_URL` (`redis://redis:6379` en compose; `redis://localhost:6379` en dev local).
  - `depends_on: redis` con `condition: service_healthy`.

## Módulo de cache — `fruit-backend/src/cache/`

`RedisCacheService` sobre `ioredis`:

- `getOrSet<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T>`
  - HIT: devuelve el JSON parseado de Redis.
  - MISS: ejecuta `compute()`, guarda con `SET key value EX ttl` y devuelve el resultado.
- `invalidatePrefix(prefix: string): Promise<void>`
  - Borra todas las claves que empiezan por el prefijo (SCAN + DEL, nunca KEYS).
- `onModuleDestroy()` cierra la conexión.

**Degradación elegante:** cualquier error de Redis (conexión caída, timeout, JSON corrupto) en `getOrSet` cae a `compute()` directo contra Postgres y loguea un warning. `invalidatePrefix` traga errores con warning. El dashboard nunca responde 5xx por culpa del cache. `ioredis` se configura con `lazyConnect: true` y reintentos acotados (`maxRetriesPerRequest` bajo, backoff limitado) para no bloquear el arranque cuando Redis no existe (dev sin Docker).

El módulo es `@Global()`, exporta `RedisCacheService` y se registra en `AppModule`.

## Claves y TTL

| Endpoint | Clave | TTL |
|---|---|---|
| `GET /admin/dashboard/yield` | `dash:yield:{productorId \| global}` | 300 s |
| `GET /admin/dashboard/health` | `dash:health:{productorId \| global}` | 300 s |
| `GET /admin/dashboard/phenology` | `dash:phenology:{productorId \| global}` | 300 s |
| `GET /admin/stats` | `admin:stats` | 300 s |

El segmento de scope es `global` para ADMIN (sin filtro) y el UUID del productor para PRODUCTOR.

## Invalidación por evento

| Evento | Dónde | Acción |
|---|---|---|
| `analisis_listo` (fruit-ms → `POST /internal/notify`) | `InternalNotifyController.notify` | `invalidatePrefix('dash:')` |
| Crear usuario / cambiar rol / eliminar usuario | `AdminService` | `invalidatePrefix('admin:stats')` |

Se invalida todo el prefijo `dash:` (global + todos los productores) sin granularidad por productor: los volúmenes de escritura son bajos y la granularidad no compensa la complejidad. El TTL de 300 s cubre cualquier vía de escritura no contemplada (p. ej. cambios directos en DB).

## Cambios en código existente

- `AdminDashboardService`: la lógica actual de `getYieldForecast`, `getHealthMetrics` y `getPhenologyDistribution` se mueve a métodos privados `compute*`; los métodos públicos envuelven con `getOrSet`. Firmas públicas sin cambios.
- `AdminService.getStats`: mismo patrón.
- `InternalNotifyController`: inyecta `RedisCacheService` e invalida en `analisis_listo`.
- Sin cambios en controllers (rutas/guards), DTOs ni en el cliente web/Flutter.

## Testing

- `RedisCacheService` (unit, mock de ioredis): HIT devuelve el valor cacheado sin llamar a `compute`; MISS llama a `compute` y guarda con TTL; error de Redis cae a `compute` sin lanzar; `invalidatePrefix` borra por SCAN.
- `AdminDashboardService` (unit): segunda llamada con la misma clave no toca Prisma; scope `global` vs `productorId` genera claves distintas.
- `InternalNotifyController` (unit): `analisis_listo` dispara `invalidatePrefix('dash:')`.

## Fuera de alcance

- Cache para otros endpoints (`/admin/users`, queries de análisis).
- Redis para otros usos (sesiones, rate limiting, colas).
- Granularidad de invalidación por productor.
