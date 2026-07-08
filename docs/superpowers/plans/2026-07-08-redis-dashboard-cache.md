# Cache Redis para métricas de admin — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cachear en Redis las respuestas de `GET /admin/dashboard/{yield,health,phenology}` y `GET /admin/stats` de `fruit-backend`, con TTL de 300 s e invalidación inmediata por evento.

**Architecture:** Un módulo global `cache/` expone `RedisCacheService` (sobre `ioredis`) con `getOrSet` e `invalidatePrefix`. Los services de admin envuelven su lógica actual con `getOrSet`; la invalidación se dispara desde `InternalNotifyController` (evento `analisis_listo`, prefijo `dash:`) y desde las mutaciones de usuarios de `AdminService` (clave `admin:stats`). Si Redis falla, todo cae a Postgres con un warning — nunca 5xx por cache.

**Tech Stack:** NestJS 11 + Fastify, `ioredis`, Jest + ts-jest, Docker Compose (`redis:7-alpine`).

**Spec:** `docs/superpowers/specs/2026-07-08-redis-dashboard-cache-design.md`

## Global Constraints

- TTL de cache: **300 segundos** para todas las claves.
- Claves: `dash:yield:{scope}`, `dash:health:{scope}`, `dash:phenology:{scope}` donde `{scope}` es el UUID del productor o `global`; y `admin:stats`.
- Errores de Redis **nunca** se propagan al cliente HTTP: `getOrSet` cae a `compute()`, `invalidatePrefix` traga el error; ambos loguean `warn`.
- `invalidatePrefix` usa `SCAN` + `DEL` (nunca `KEYS`).
- Firmas públicas de `AdminDashboardService`, `AdminService` y controllers **sin cambios** (los métodos ahora devuelven `Promise` igual que antes).
- Comandos se ejecutan desde `fruit-backend/` salvo que se indique lo contrario. Tests: `pnpm run test -- --testPathPatterns=<pattern>`.
- Comentarios y mensajes de log en español, siguiendo el estilo del código existente.

---

### Task 1: Módulo de cache — `RedisCacheService`

**Files:**
- Create: `fruit-backend/src/cache/redis-cache.service.ts`
- Create: `fruit-backend/src/cache/cache.module.ts`
- Test: `fruit-backend/src/cache/redis-cache.service.spec.ts`
- Modify: `fruit-backend/src/app.module.ts` (registrar `CacheModule`)
- Modify: `fruit-backend/package.json` (vía `pnpm add ioredis`)

**Interfaces:**
- Consumes: nada (task base).
- Produces:
  - `RedisCacheService.getOrSet<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T>`
  - `RedisCacheService.invalidatePrefix(prefix: string): Promise<void>`
  - Token de inyección `REDIS_CLIENT` (Symbol) exportado desde `redis-cache.service.ts`
  - `CacheModule` (`@Global()`, exporta `RedisCacheService`)

- [ ] **Step 1: Instalar ioredis**

Run (en `fruit-backend/`): `pnpm add ioredis`
Expected: `ioredis` aparece en `dependencies` de `fruit-backend/package.json` (trae sus propios types, no necesita `@types/`).

- [ ] **Step 2: Escribir los tests que fallan**

Crear `fruit-backend/src/cache/redis-cache.service.spec.ts`:

```typescript
import { RedisCacheService } from './redis-cache.service';

type MockRedis = {
  get: jest.Mock;
  set: jest.Mock;
  scan: jest.Mock;
  del: jest.Mock;
  on: jest.Mock;
  quit: jest.Mock;
};

const makeRedis = (): MockRedis => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  scan: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
});

describe('RedisCacheService', () => {
  let redis: MockRedis;
  let service: RedisCacheService;

  beforeEach(() => {
    redis = makeRedis();
    service = new RedisCacheService(redis as never);
  });

  describe('getOrSet()', () => {
    it('HIT: devuelve el valor cacheado sin ejecutar compute', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ total: 5 }));
      const compute = jest.fn();

      const result = await service.getOrSet('dash:health:global', 300, compute);

      expect(result).toEqual({ total: 5 });
      expect(compute).not.toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalledWith('dash:health:global');
    });

    it('MISS: ejecuta compute y guarda el JSON con TTL', async () => {
      redis.get.mockResolvedValue(null);
      const compute = jest.fn().mockResolvedValue([1, 2, 3]);

      const result = await service.getOrSet('dash:yield:global', 300, compute);

      expect(result).toEqual([1, 2, 3]);
      expect(compute).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        'dash:yield:global',
        JSON.stringify([1, 2, 3]),
        'EX',
        300,
      );
    });

    it('error de Redis en GET: cae a compute sin lanzar y no intenta SET', async () => {
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const compute = jest.fn().mockResolvedValue('fallback');

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe('fallback');
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('JSON corrupto en cache: cae a compute sin lanzar', async () => {
      redis.get.mockResolvedValue('{no-es-json');
      const compute = jest.fn().mockResolvedValue('fresco');

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe('fresco');
    });

    it('error de Redis en SET: devuelve el valor computado igualmente', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
      const compute = jest.fn().mockResolvedValue(42);

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe(42);
    });
  });

  describe('invalidatePrefix()', () => {
    it('recorre SCAN hasta cursor 0 y borra todas las claves encontradas', async () => {
      redis.scan
        .mockResolvedValueOnce(['5', ['dash:yield:global', 'dash:health:global']])
        .mockResolvedValueOnce(['0', ['dash:phenology:abc']]);

      await service.invalidatePrefix('dash:');

      expect(redis.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'dash:*', 'COUNT', 100);
      expect(redis.scan).toHaveBeenNthCalledWith(2, '5', 'MATCH', 'dash:*', 'COUNT', 100);
      expect(redis.del).toHaveBeenCalledWith('dash:yield:global', 'dash:health:global');
      expect(redis.del).toHaveBeenCalledWith('dash:phenology:abc');
    });

    it('no llama a DEL cuando SCAN no devuelve claves', async () => {
      redis.scan.mockResolvedValueOnce(['0', []]);

      await service.invalidatePrefix('dash:');

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('error de Redis: no lanza', async () => {
      redis.scan.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.invalidatePrefix('dash:')).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy()', () => {
    it('cierra la conexión con quit()', async () => {
      await service.onModuleDestroy();
      expect(redis.quit).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 3: Ejecutar los tests y verificar que fallan**

Run: `pnpm run test -- --testPathPatterns=redis-cache`
Expected: FAIL — `Cannot find module './redis-cache.service'`.

- [ ] **Step 4: Implementar `RedisCacheService`**

Crear `fruit-backend/src/cache/redis-cache.service.ts`:

```typescript
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';

/** Token de inyección del cliente ioredis (permite mockearlo en tests). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Cache de lectura sobre Redis con degradación elegante:
 * si Redis no está disponible, toda lectura cae al cómputo
 * directo contra la base de datos y se loguea un warning.
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    // Sin listener, un error de conexión emitido por ioredis tumba el proceso.
    this.redis.on('error', (err: Error) => {
      this.logger.warn(`Redis no disponible: ${err.message}`);
    });
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    compute: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached) as T;
    } catch (err) {
      this.logger.warn(
        `Cache GET falló para "${key}", se calcula desde DB: ${(err as Error).message}`,
      );
      return compute();
    }

    const value = await compute();
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Cache SET falló para "${key}": ${(err as Error).message}`,
      );
    }
    return value;
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        cursor = next;
        if (keys.length > 0) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(
        `Invalidación de cache falló para prefijo "${prefix}": ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
```

- [ ] **Step 5: Ejecutar los tests y verificar que pasan**

Run: `pnpm run test -- --testPathPatterns=redis-cache`
Expected: PASS (9 tests).

- [ ] **Step 6: Crear `CacheModule` y registrarlo en `AppModule`**

Crear `fruit-backend/src/cache/cache.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisCacheService } from './redis-cache.service';

/**
 * Módulo global de cache. lazyConnect + enableOfflineQueue: false
 * hacen que los comandos fallen rápido cuando Redis no existe
 * (p. ej. dev local sin Docker) en vez de encolar y bloquear.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 500, 5000),
        }),
    },
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class CacheModule {}
```

En `fruit-backend/src/app.module.ts`, añadir el import:

```typescript
import { CacheModule } from './cache/cache.module';
```

y añadir `CacheModule,` a la lista `imports` del decorador, justo después de `ThrottlerModule.forRoot([...])`:

```typescript
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 1000 },
      { name: 'auth', ttl: 60000, limit: 10 }, // 10 intentos/min en endpoints de auth
    ]),
    CacheModule,
    FcmModule,
```

- [ ] **Step 7: Verificar build y suite completa**

Run: `pnpm run build`
Expected: compila sin errores.

Run: `pnpm run test`
Expected: PASS — la suite existente sigue verde.

- [ ] **Step 8: Commit**

```bash
git add fruit-backend/src/cache fruit-backend/src/app.module.ts fruit-backend/package.json pnpm-lock.yaml
git commit -m "feat(cache): módulo Redis con getOrSet e invalidación por prefijo"
```

---

### Task 2: Infraestructura — Redis en Docker Compose

**Files:**
- Modify: `docker-compose.yml`
- Modify: `CLAUDE.md` (sección Environment Variables)

**Interfaces:**
- Consumes: nada.
- Produces: servicio `redis` accesible como `redis://redis:6379` dentro de `fruit-net`; variable `REDIS_URL` disponible en el contenedor de `fruit-backend`.

- [ ] **Step 1: Añadir el servicio redis a `docker-compose.yml`**

Insertar después del bloque `rabbitmq` (línea ~34) y antes de `fruit-backend`:

```yaml
  # ── Cache ────────────────────────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    ports:
      - "127.0.0.1:6379:6379" # Solo para desarrollo local
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [fruit-net]
```

- [ ] **Step 2: Conectar fruit-backend a Redis**

En el servicio `fruit-backend` de `docker-compose.yml`:

Añadir a su bloque `environment`:

```yaml
      REDIS_URL: "redis://redis:6379"
```

Añadir a su bloque `depends_on`:

```yaml
      redis:
        condition: service_healthy
```

- [ ] **Step 3: Validar el compose**

Run (en la raíz del workspace): `docker compose config --quiet`
Expected: exit 0, sin errores de sintaxis.

- [ ] **Step 4: Documentar la variable en CLAUDE.md**

En `CLAUDE.md`, sección **Environment Variables**, línea de `fruit-backend/.env`, añadir `REDIS_URL` a la lista de variables clave:

```markdown
**fruit-backend/.env**: `MONGO_URI`, `JWT_SECRET`, `R2_BUCKET_NAME`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `RABBITMQ_URL`, `FCM_SERVER_KEY`, `REDIS_URL` (cache del dashboard; default `redis://localhost:6379`)
```

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml CLAUDE.md
git commit -m "feat(infra): servicio Redis en docker-compose para cache del dashboard"
```

---

### Task 3: Cache en `AdminDashboardService`

**Files:**
- Modify: `fruit-backend/src/admin/admin-dashboard.service.ts`
- Test: `fruit-backend/src/admin/admin-dashboard.service.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `RedisCacheService.getOrSet(key, ttlSeconds, compute)` de Task 1 (inyectado por constructor; `CacheModule` es global, no hay que importarlo en `AdminModule`).
- Produces: firmas públicas sin cambios — `getYieldForecast(productorId?: string)`, `getHealthMetrics(productorId?: string)`, `getPhenologyDistribution(productorId?: string)`, todas devuelven `Promise` como antes. Claves `dash:yield:*`, `dash:health:*`, `dash:phenology:*`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `fruit-backend/src/admin/admin-dashboard.service.spec.ts`:

```typescript
import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '@rubus/database';
import { RedisCacheService } from '../cache/redis-cache.service';

describe('AdminDashboardService', () => {
  let prisma: { $queryRaw: jest.Mock; analysis: { aggregate: jest.Mock } };
  let cache: { getOrSet: jest.Mock };
  let service: AdminDashboardService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn(), analysis: { aggregate: jest.fn() } };
    // Passthrough: ejecuta compute() para poder verificar la lógica interna,
    // y a la vez permite asertar clave y TTL.
    cache = {
      getOrSet: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
    };
    service = new AdminDashboardService(
      prisma as unknown as PrismaService,
      cache as unknown as RedisCacheService,
    );
  });

  describe('getYieldForecast()', () => {
    it('usa la clave global con TTL 300 cuando no hay productorId', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getYieldForecast();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:yield:global',
        300,
        expect.any(Function),
      );
    });

    it('usa la clave del productor y convierte los agregados a number', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { daysToHarvest: 3n, estimatedWeightGrams: '1500' },
      ]);

      const result = await service.getYieldForecast('prod-1');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:yield:prod-1',
        300,
        expect.any(Function),
      );
      expect(result).toEqual([{ daysToHarvest: 3, estimatedWeightGrams: 1500 }]);
    });
  });

  describe('getHealthMetrics()', () => {
    it('usa la clave correcta y mapea el aggregate con defaults en 0', async () => {
      prisma.analysis.aggregate.mockResolvedValue({
        _avg: { porcentajeMermaGeneral: null },
        _sum: {
          elementosEnfermos: null,
          elementosSanos: 10,
          totalElementosDetectados: 12,
        },
      });

      const result = await service.getHealthMetrics('prod-1');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:health:prod-1',
        300,
        expect.any(Function),
      );
      expect(result).toEqual({
        avgLossPercent: 0,
        totalSickCount: 0,
        totalHealthyCount: 10,
        totalDetected: 12,
      });
    });
  });

  describe('getPhenologyDistribution()', () => {
    it('usa la clave global y convierte count a number', async () => {
      prisma.$queryRaw.mockResolvedValue([{ stage: 'maduro', count: 7n }]);

      const result = await service.getPhenologyDistribution();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:phenology:global',
        300,
        expect.any(Function),
      );
      expect(result).toEqual([{ stage: 'maduro', count: 7 }]);
    });
  });

  it('en cache HIT no toca Prisma', async () => {
    cache.getOrSet.mockResolvedValue([{ stage: 'maduro', count: 1 }]);

    await service.getPhenologyDistribution();

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.analysis.aggregate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

Run: `pnpm run test -- --testPathPatterns=admin-dashboard`
Expected: FAIL — el constructor actual solo acepta `prisma` y no hay claves de cache.

- [ ] **Step 3: Implementar el cache en el service**

Reemplazar el contenido completo de `fruit-backend/src/admin/admin-dashboard.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { RedisCacheService } from '../cache/redis-cache.service';

/** TTL de las métricas del dashboard; red de seguridad además de la invalidación por evento. */
const DASHBOARD_TTL_SECONDS = 300;

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RedisCacheService,
  ) {}

  getYieldForecast(productorId?: string) {
    return this.cache.getOrSet(
      `dash:yield:${productorId ?? 'global'}`,
      DASHBOARD_TTL_SECONDS,
      () => this.computeYieldForecast(productorId),
    );
  }

  getHealthMetrics(productorId?: string) {
    return this.cache.getOrSet(
      `dash:health:${productorId ?? 'global'}`,
      DASHBOARD_TTL_SECONDS,
      () => this.computeHealthMetrics(productorId),
    );
  }

  getPhenologyDistribution(productorId?: string) {
    return this.cache.getOrSet(
      `dash:phenology:${productorId ?? 'global'}`,
      DASHBOARD_TTL_SECONDS,
      () => this.computePhenologyDistribution(productorId),
    );
  }

  private async computeYieldForecast(productorId?: string) {
    type Row = { daysToHarvest: number; estimatedWeightGrams: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  (fe.etapa = 'maduro' OR fe.cambia_a = 'maduro')
            AND  a.productor_id = ${productorId}::uuid
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`
      : await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  fe.etapa = 'maduro' OR fe.cambia_a = 'maduro'
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`;
    return rows.map((r) => ({
      daysToHarvest: Number(r.daysToHarvest),
      estimatedWeightGrams: Number(r.estimatedWeightGrams),
    }));
  }

  private async computeHealthMetrics(productorId?: string) {
    const result = await this.prisma.analysis.aggregate({
      where: productorId ? { productorId } : undefined,
      _avg: { porcentajeMermaGeneral: true },
      _sum: {
        elementosEnfermos: true,
        elementosSanos: true,
        totalElementosDetectados: true,
      },
    });
    return {
      avgLossPercent: result._avg.porcentajeMermaGeneral ?? 0,
      totalSickCount: result._sum.elementosEnfermos ?? 0,
      totalHealthyCount: result._sum.elementosSanos ?? 0,
      totalDetected: result._sum.totalElementosDetectados ?? 0,
    };
  }

  private async computePhenologyDistribution(productorId?: string) {
    type Row = { stage: string; count: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  a.productor_id = ${productorId}::uuid
          GROUP BY fe.etapa
          ORDER BY count DESC`
      : await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          GROUP BY fe.etapa
          ORDER BY count DESC`;
    return rows.map((r) => ({ stage: r.stage, count: Number(r.count) }));
  }
}
```

(Las queries SQL son las existentes movidas a métodos privados `compute*` — no cambian.)

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `pnpm run test -- --testPathPatterns=admin-dashboard`
Expected: PASS (6 tests).

- [ ] **Step 5: Verificar build y suite completa**

Run: `pnpm run build`
Expected: compila sin errores.

Run: `pnpm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/admin/admin-dashboard.service.ts fruit-backend/src/admin/admin-dashboard.service.spec.ts
git commit -m "feat(admin): cache Redis en métricas del dashboard (TTL 300s)"
```

---

### Task 4: Cache en `AdminService.getStats` + invalidación en mutaciones de usuarios

**Files:**
- Modify: `fruit-backend/src/admin/admin.service.ts`
- Test: `fruit-backend/src/admin/admin.service.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `RedisCacheService.getOrSet` e `invalidatePrefix` de Task 1.
- Produces: `getStats(): Promise<AdminStats>` sin cambio de firma, cacheado bajo `admin:stats`. `createUser`, `updateUserRole` y `deleteUser` invalidan `admin:stats` tras escribir. (`updateName`, `updateCampos` y `updatePassword` NO invalidan: no cambian los conteos por rol.)

- [ ] **Step 1: Escribir los tests que fallan**

Crear `fruit-backend/src/admin/admin.service.spec.ts`:

```typescript
import { AdminService } from './admin.service';
import { PrismaService } from '@rubus/database';
import { RedisCacheService } from '../cache/redis-cache.service';
import { Role } from '../auth/domain/enums/role.enum';
import type { IHasherPort } from '../auth/ports/hasher.port';

describe('AdminService — cache de stats', () => {
  let prisma: {
    user: {
      groupBy: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
    };
  };
  let cache: { getOrSet: jest.Mock; invalidatePrefix: jest.Mock };
  let hasher: IHasherPort;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        groupBy: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    cache = {
      getOrSet: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
      invalidatePrefix: jest.fn().mockResolvedValue(undefined),
    };
    hasher = { hash: jest.fn().mockResolvedValue('hashed'), compare: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      hasher,
      cache as unknown as RedisCacheService,
    );
  });

  describe('getStats()', () => {
    it('envuelve el cómputo con la clave admin:stats y TTL 300', async () => {
      prisma.user.groupBy.mockResolvedValue([
        { role: 'ADMIN', _count: { id: 1 } },
        { role: 'PRODUCTOR', _count: { id: 4 } },
      ]);

      const result = await service.getStats();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'admin:stats',
        300,
        expect.any(Function),
      );
      expect(result.totalUsers).toBe(5);
      expect(result.usersByRole.PRODUCTOR).toBe(4);
    });
  });

  describe('invalidación de admin:stats', () => {
    it('updateUserRole invalida tras actualizar', async () => {
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        role: 'AGRONOMO',
        createdAt: new Date(),
      });

      await service.updateUserRole('u1', Role.AGRONOMO);

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('createUser invalida tras crear', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        email: 'nuevo@b.c',
        role: 'PRODUCTOR',
        firstName: null,
        lastName: null,
        createdAt: new Date(),
      });

      await service.createUser('nuevo@b.c', 'secret123', Role.PRODUCTOR);

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('deleteUser invalida tras borrar', async () => {
      await service.deleteUser('u3', 'admin-1');

      expect(cache.invalidatePrefix).toHaveBeenCalledWith('admin:stats');
    });

    it('deleteUser NO invalida si el borrado es rechazado (auto-borrado)', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow();

      expect(cache.invalidatePrefix).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

Run: `pnpm run test -- --testPathPatterns=admin.service`
Expected: FAIL — el constructor actual solo acepta 2 argumentos y no existe invalidación.

- [ ] **Step 3: Implementar cache e invalidación en `AdminService`**

En `fruit-backend/src/admin/admin.service.ts`:

**3a.** Añadir import:

```typescript
import { RedisCacheService } from '../cache/redis-cache.service';
```

**3b.** Añadir constante bajo los imports (antes de `export interface UserSummary`):

```typescript
/** TTL del cache de stats; red de seguridad además de la invalidación por mutación. */
const STATS_TTL_SECONDS = 300;
const STATS_CACHE_KEY = 'admin:stats';
```

**3c.** Ampliar el constructor:

```typescript
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_HASHER_PORT) private readonly hasher: IHasherPort,
    private readonly cache: RedisCacheService,
  ) {}
```

**3d.** Reemplazar `getStats()` (líneas 101-117) por:

```typescript
  getStats(): Promise<AdminStats> {
    return this.cache.getOrSet(STATS_CACHE_KEY, STATS_TTL_SECONDS, () =>
      this.computeStats(),
    );
  }

  private async computeStats(): Promise<AdminStats> {
    const roleCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const usersByRole = Object.values(Role).reduce(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {} as Record<Role, number>,
    );
    for (const { role, _count } of roleCounts) {
      usersByRole[role as Role] = _count.id;
    }
    return {
      totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      usersByRole,
    };
  }
```

**3e.** En `updateUserRole`, tras el `await this.prisma.user.update({...})` y antes del `return`:

```typescript
    await this.cache.invalidatePrefix(STATS_CACHE_KEY);
```

**3f.** En `createUser`, tras el `await this.prisma.user.create({...})` y antes del `return`:

```typescript
    await this.cache.invalidatePrefix(STATS_CACHE_KEY);
```

**3g.** Reemplazar el cuerpo de `deleteUser` por:

```typescript
  async deleteUser(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId)
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    await this.prisma.user.delete({ where: { id: userId } });
    await this.cache.invalidatePrefix(STATS_CACHE_KEY);
  }
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `pnpm run test -- --testPathPatterns=admin.service`
Expected: PASS (5 tests).

- [ ] **Step 5: Verificar build y suite completa**

Run: `pnpm run build`
Expected: compila sin errores.

Run: `pnpm run test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/admin/admin.service.ts fruit-backend/src/admin/admin.service.spec.ts
git commit -m "feat(admin): cache Redis en stats con invalidación por mutación de usuarios"
```

---

### Task 5: Invalidación del dashboard al llegar `analisis_listo`

**Files:**
- Modify: `fruit-backend/src/notifications/internal-notify.controller.ts`
- Test: `fruit-backend/src/notifications/internal-notify.controller.spec.ts` (nuevo)

**Interfaces:**
- Consumes: `RedisCacheService.invalidatePrefix('dash:')` de Task 1.
- Produces: al recibir `POST /internal/notify` con `event: 'analisis_listo'`, se invalidan todas las claves `dash:*` antes de responder. Otros eventos no tocan el cache.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `fruit-backend/src/notifications/internal-notify.controller.spec.ts`:

```typescript
import { InternalNotifyController } from './internal-notify.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import type { IUserRepository } from '../auth/ports/user-repository.port';

describe('InternalNotifyController — invalidación de cache', () => {
  const TOKEN = 'test-internal-token';
  let gateway: { emitToUser: jest.Mock };
  let fcmService: { sendToDevice: jest.Mock };
  let userRepository: { findFcmTokenById: jest.Mock; clearFcmToken: jest.Mock };
  let notificationsService: { create: jest.Mock };
  let cache: { invalidatePrefix: jest.Mock };
  let controller: InternalNotifyController;

  beforeEach(() => {
    process.env.INTERNAL_NOTIFY_TOKEN = TOKEN;
    gateway = { emitToUser: jest.fn() };
    fcmService = { sendToDevice: jest.fn().mockResolvedValue(undefined) };
    userRepository = {
      findFcmTokenById: jest.fn().mockResolvedValue(null),
      clearFcmToken: jest.fn(),
    };
    notificationsService = { create: jest.fn().mockResolvedValue(undefined) };
    cache = { invalidatePrefix: jest.fn().mockResolvedValue(undefined) };
    controller = new InternalNotifyController(
      gateway as unknown as NotificationsGateway,
      fcmService as unknown as FcmService,
      userRepository as unknown as IUserRepository,
      notificationsService as unknown as NotificationsService,
      cache as unknown as RedisCacheService,
    );
  });

  it('analisis_listo invalida el prefijo dash:', async () => {
    await controller.notify(TOKEN, {
      event: 'analisis_listo',
      data: { userId: 'u1' },
    });

    expect(cache.invalidatePrefix).toHaveBeenCalledWith('dash:');
  });

  it('otros eventos no tocan el cache', async () => {
    await controller.notify(TOKEN, {
      event: 'nueva_solicitud',
      data: { userId: 'u1' },
    });

    expect(cache.invalidatePrefix).not.toHaveBeenCalled();
  });

  it('token inválido: rechaza sin invalidar', async () => {
    await expect(
      controller.notify('token-malo', { event: 'analisis_listo', data: {} }),
    ).rejects.toThrow();

    expect(cache.invalidatePrefix).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Ejecutar los tests y verificar que fallan**

Run: `pnpm run test -- --testPathPatterns=internal-notify`
Expected: FAIL — el constructor actual no recibe cache y no existe la invalidación.

- [ ] **Step 3: Implementar la invalidación**

En `fruit-backend/src/notifications/internal-notify.controller.ts`:

**3a.** Añadir import:

```typescript
import { RedisCacheService } from '../cache/redis-cache.service';
```

**3b.** Añadir al final del constructor:

```typescript
    private readonly cache: RedisCacheService,
```

**3c.** En el método `notify`, justo después de la validación del token (tras el `throw new UnauthorizedException(...)`), añadir:

```typescript
    // Un análisis nuevo cambia las métricas del dashboard: invalida su cache.
    if (body.event === 'analisis_listo') {
      await this.cache.invalidatePrefix('dash:');
    }
```

- [ ] **Step 4: Ejecutar los tests y verificar que pasan**

Run: `pnpm run test -- --testPathPatterns=internal-notify`
Expected: PASS (3 tests).

- [ ] **Step 5: Verificar build, lint y suite completa**

Run: `pnpm run build`
Expected: compila sin errores.

Run: `pnpm run lint`
Expected: sin errores.

Run: `pnpm run test`
Expected: PASS — toda la suite verde.

- [ ] **Step 6: Commit**

```bash
git add fruit-backend/src/notifications/internal-notify.controller.ts fruit-backend/src/notifications/internal-notify.controller.spec.ts
git commit -m "feat(notifications): invalidar cache del dashboard al recibir analisis_listo"
```

---

## Verificación end-to-end (manual, tras completar las tasks)

1. `docker compose up --build redis postgres rabbitmq fruit-backend`
2. Login como ADMIN y llamar dos veces `GET /api/v1/admin/dashboard/health` — la segunda debe responder desde cache (verificable con `docker compose exec redis redis-cli KEYS 'dash:*'`, que debe listar `dash:health:global`).
3. Simular un análisis nuevo: `POST /api/v1/internal/notify` con header `x-internal-token` y body `{"event":"analisis_listo","data":{"userId":"<uuid>"}}` — `redis-cli KEYS 'dash:*'` debe quedar vacío.
4. Parar Redis (`docker compose stop redis`) y repetir la llamada al dashboard — debe responder 200 desde Postgres con un warning `Redis no disponible` en los logs de fruit-backend.
