# Reintentos + DLX para `nueva_fruta` — Implementation Plan

**Spec relacionado:** [[2026-07-09-fruit-ms-retries-dlx-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un fallo al procesar `nueva_fruta` en `fruit-ms` se reintente con backoff y, si se agota, el mensaje termine en una cola de muertos inspeccionable en vez de perderse.

**Architecture:** `fruit-ms` pasa a ack manual (`noAck: false`) con reintentos in-process (3 intentos, backoff exponencial) en el controller; al agotarse hace `nack` sin requeue y RabbitMQ enruta el mensaje al exchange `fruit.dlx` → cola `<queue>.dlq`, declarados idempotentemente con `amqplib` en el bootstrap. `FruitsService.process()` deja de tragar errores. Los clientes RMQ de `fruit-backend` declaran la cola con los mismos argumentos DLX y el de ingestion publica con `persistent: true`.

**Tech Stack:** NestJS 11 (`@nestjs/microservices` Transport.RMQ), `amqplib` 0.10 (ya es dependencia de `fruit-ms`), Jest, joi.

**Spec:** `docs/superpowers/specs/2026-07-09-fruit-ms-retries-dlx-design.md`

## Global Constraints

- Nombre del exchange de muertos: `fruit.dlx` (direct, durable). Cola de muertos: `<RABBITMQ_QUEUE>.dlq` (durable, sin TTL). Routing key del binding: `<RABBITMQ_QUEUE>.dlq`.
- `RABBITMQ_QUEUE` es `ingestion_queue` en todos los `.env.example`.
- Los argumentos de declaración de la cola principal (`x-dead-letter-exchange`, `x-dead-letter-routing-key`) deben ser **idénticos byte a byte** en `fruit-ms`, `fruit-backend/ingestion` y `fruit-backend/fruits-query`, o RabbitMQ cierra el canal con `PRECONDITION_FAILED`.
- Defaults de reintentos: `NUEVA_FRUTA_MAX_ATTEMPTS=3`, `NUEVA_FRUTA_BACKOFF_BASE_MS=2000`; espera entre intentos = `base * 4^(intento-1)` (2 s, 8 s).
- Gestor de paquetes: `pnpm`. Ejecutar comandos desde el directorio del servicio (`fruit-ms/` o `fruit-backend/`).
- Commits con la identidad del usuario, **sin** trailer `Co-Authored-By`.
- En `fruit-backend` hay 11 tests preexistentes fallando en `fcm`/`solicitudes` — no son de este cambio; ejecutar tests con filtro por archivo.

---

### Task 1: `FruitsService.process()` propaga errores

Hoy `process()` hace `catch` + `log` + `return` en los pasos de inferencia y persistencia, así que ningún fallo llega al controller. Sin esto, los reintentos de la Task 2 no tienen nada que reintentar.

**Files:**
- Modify: `fruit-ms/src/fruits/fruits.service.ts:36-49` y `:66-74`
- Test (create): `fruit-ms/src/fruits/fruits.service.spec.ts`

**Interfaces:**
- Consumes: `IInferencePort.analyze()`, `IAnalysisRepository.save()` (existentes, sin cambios).
- Produces: `FruitsService.process(data: NuevaFrutaDto): Promise<void>` que **rechaza** si la inferencia o el guardado fallan, y **resuelve** aunque falle la notificación WebSocket. La Task 2 depende de este contrato.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `fruit-ms/src/fruits/fruits.service.spec.ts`:

```ts
import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

jest.mock('../config/envs', () => ({
  envs: {
    backendUrl: 'http://fruit-backend:3000',
    internalNotifyToken: 'x'.repeat(32),
  },
}));

describe('FruitsService.process', () => {
  const dto = { image_id: 'img-1', storage_key: 'k1' } as NuevaFrutaDto;

  const analysis = {
    image_id: 'img-1',
    campo_id: null,
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 100 },
    cronograma_fenologico: [],
  };

  let inference: { analyze: jest.Mock };
  let repo: { save: jest.Mock; findAll: jest.Mock; findById: jest.Mock };
  let http: { axiosRef: { post: jest.Mock } };
  let service: FruitsService;

  beforeEach(() => {
    inference = { analyze: jest.fn().mockResolvedValue(analysis) };
    repo = {
      save: jest.fn().mockResolvedValue('saved-id'),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    http = { axiosRef: { post: jest.fn().mockResolvedValue({}) } };
    service = new FruitsService(inference as any, repo as any, http as any);
  });

  it('propaga el error cuando la inferencia falla y no intenta guardar', async () => {
    inference.analyze.mockRejectedValue(new Error('inference down'));

    await expect(service.process(dto)).rejects.toThrow('inference down');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el guardado falla', async () => {
    repo.save.mockRejectedValue(new Error('db down'));

    await expect(service.process(dto)).rejects.toThrow('db down');
  });

  it('resuelve aunque la notificación al backend falle (no-crítica)', async () => {
    http.axiosRef.post.mockRejectedValue(new Error('backend down'));

    await expect(service.process(dto)).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Verificar que fallan**

```bash
cd fruit-ms
pnpm run test -- fruits.service.spec
```

Expected: FAIL — los dos primeros tests fallan porque `process()` resuelve en vez de rechazar (`Received promise resolved instead of rejected`). El tercero pasa.

- [ ] **Step 3: Relanzar errores en `process()`**

En `fruit-ms/src/fruits/fruits.service.ts`, cambiar el catch de inferencia (líneas 44-49):

```ts
    } catch (err) {
      this.logger.error(
        `Error al procesar inferencia: ${(err as Error).message}`,
      );
      throw err;
    }
```

Y el catch de persistencia (líneas 71-74):

```ts
    } catch (err) {
      this.logger.error(`Error al guardar el análisis: ${(err as Error).message}`);
      throw err;
    }
```

El catch silencioso de la notificación (paso 4 del método) queda igual.

- [ ] **Step 4: Verificar que pasan**

```bash
pnpm run test -- fruits.service.spec
```

Expected: PASS (3 tests).

- [ ] **Step 5: Lint y commit**

```bash
pnpm run lint
git add src/fruits/fruits.service.ts src/fruits/fruits.service.spec.ts
git commit -m "fix(fruit-ms): FruitsService.process propaga errores de inferencia y guardado"
```

---

### Task 2: Reintentos con backoff y ack/nack manual en `FruitsController`

**Files:**
- Modify: `fruit-ms/src/config/envs.ts`
- Modify: `fruit-ms/.env.example`
- Modify: `fruit-ms/src/fruits/fruits.controller.ts`
- Test (create): `fruit-ms/src/fruits/fruits.controller.spec.ts`

**Interfaces:**
- Consumes: `FruitsService.process()` que rechaza en fallo (Task 1).
- Produces: handlers que **siempre** hacen `ack` o `nack` explícito sobre el canal del `RmqContext`; `envs.nuevaFrutaMaxAttempts: number` y `envs.nuevaFrutaBackoffBaseMs: number`. La Task 3 activa `noAck: false`, que exige este comportamiento.

- [ ] **Step 1: Añadir las envs de reintentos**

En `fruit-ms/src/config/envs.ts`, añadir a la interfaz `EnvVars`:

```ts
  NUEVA_FRUTA_MAX_ATTEMPTS:    number;
  NUEVA_FRUTA_BACKOFF_BASE_MS: number;
```

Al schema joi (dentro de `joi.object({...})`):

```ts
    NUEVA_FRUTA_MAX_ATTEMPTS:    joi.number().integer().min(1).default(3),
    NUEVA_FRUTA_BACKOFF_BASE_MS: joi.number().integer().min(0).default(2000),
```

Y al objeto `envs` exportado:

```ts
  nuevaFrutaMaxAttempts:   envVars.NUEVA_FRUTA_MAX_ATTEMPTS,
  nuevaFrutaBackoffBaseMs: envVars.NUEVA_FRUTA_BACKOFF_BASE_MS,
```

En `fruit-ms/.env.example`, añadir al final:

```
# Reintentos del consumidor nueva_fruta (opcionales, defaults: 3 y 2000)
NUEVA_FRUTA_MAX_ATTEMPTS=3
NUEVA_FRUTA_BACKOFF_BASE_MS=2000
```

- [ ] **Step 2: Escribir los tests del controller (fallan)**

Crear `fruit-ms/src/fruits/fruits.controller.spec.ts`. Se mockea `envs` con backoff 0 para no esperar el backoff real (mismo efecto que fake timers, sin su fricción con promesas):

```ts
import { RmqContext } from '@nestjs/microservices';
import { FruitsController } from './fruits.controller';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

jest.mock('../config/envs', () => ({
  envs: {
    nuevaFrutaMaxAttempts: 3,
    nuevaFrutaBackoffBaseMs: 0,
  },
}));

const makeCtx = () => {
  const channel = { ack: jest.fn(), nack: jest.fn() };
  const message = { content: Buffer.from('{}') };
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as unknown as RmqContext;
  return { channel, message, context };
};

describe('FruitsController', () => {
  const dto = { image_id: 'img-1', storage_key: 'k1' } as NuevaFrutaDto;

  let service: {
    process: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
  };
  let controller: FruitsController;

  beforeEach(() => {
    service = { process: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
    controller = new FruitsController(service as any);
  });

  describe('handleNuevaFruta', () => {
    it('hace ack al primer intento exitoso', async () => {
      service.process.mockResolvedValue(undefined);
      const { channel, message, context } = makeCtx();

      await controller.handleNuevaFruta(dto, context);

      expect(service.process).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('reintenta y hace ack si un intento posterior tiene éxito', async () => {
      service.process
        .mockRejectedValueOnce(new Error('intento 1'))
        .mockRejectedValueOnce(new Error('intento 2'))
        .mockResolvedValueOnce(undefined);
      const { channel, message, context } = makeCtx();

      await controller.handleNuevaFruta(dto, context);

      expect(service.process).toHaveBeenCalledTimes(3);
      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('hace nack sin requeue tras agotar los intentos y no relanza', async () => {
      service.process.mockRejectedValue(new Error('siempre falla'));
      const { channel, message, context } = makeCtx();

      await expect(
        controller.handleNuevaFruta(dto, context),
      ).resolves.toBeUndefined();

      expect(service.process).toHaveBeenCalledTimes(3);
      expect(channel.nack).toHaveBeenCalledWith(message, false, false);
      expect(channel.ack).not.toHaveBeenCalled();
    });
  });

  describe('handlers request-reply', () => {
    it('get_fruits hace ack y devuelve el resultado', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0 });
      const { channel, message, context } = makeCtx();

      const result = await controller.getAll({}, context);

      expect(result).toEqual({ data: [], total: 0 });
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruits hace ack aunque el service lance', async () => {
      service.findAll.mockRejectedValue(new Error('boom'));
      const { channel, message, context } = makeCtx();

      await expect(controller.getAll({}, context)).rejects.toThrow('boom');
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruit_by_id hace ack y devuelve null si no existe', async () => {
      service.findById.mockRejectedValue(new Error('not found'));
      const { channel, message, context } = makeCtx();

      const result = await controller.getById({ id: 'x' }, context);

      expect(result).toBeNull();
      expect(channel.ack).toHaveBeenCalledWith(message);
    });
  });
});
```

- [ ] **Step 3: Verificar que fallan**

```bash
pnpm run test -- fruits.controller.spec
```

Expected: FAIL — los handlers actuales no aceptan `RmqContext` ni llaman a `ack`/`nack` (`channel.ack` con 0 llamadas).

- [ ] **Step 4: Implementar el controller**

Reemplazar el contenido de `fruit-ms/src/fruits/fruits.controller.ts` por:

```ts
import { Controller, Logger } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import type { Channel } from 'amqplib';
import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { envs } from '../config/envs';

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

@Controller()
export class FruitsController {
  private readonly logger = new Logger(FruitsController.name);

  constructor(private readonly fruitsService: FruitsService) {}

  /**
   * Reintenta process() con backoff exponencial. El resultado es siempre
   * un ack o un nack explícito (noAck: false): nack sin requeue enruta el
   * mensaje al DLX fruit.dlx → cola <queue>.dlq.
   */
  @EventPattern('nueva_fruta')
  async handleNuevaFruta(
    @Payload() data: NuevaFrutaDto,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef() as Channel;
    const originalMsg = context.getMessage() as Parameters<Channel['ack']>[0];
    const maxAttempts = envs.nuevaFrutaMaxAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.fruitsService.process(data);
        channel.ack(originalMsg);
        return;
      } catch (err) {
        const message = (err as Error).message;
        if (attempt === maxAttempts) {
          this.logger.error(
            `nueva_fruta agotó ${maxAttempts} intentos, enviando a DLQ | id=${data.image_id} | ${message}`,
          );
          channel.nack(originalMsg, false, false);
          return;
        }
        const delayMs = envs.nuevaFrutaBackoffBaseMs * 4 ** (attempt - 1);
        this.logger.warn(
          `nueva_fruta intento ${attempt}/${maxAttempts} falló, reintento en ${delayMs} ms | id=${data.image_id} | ${message}`,
        );
        await sleep(delayMs);
      }
    }
  }

  /** Devuelve todos los análisis almacenados (paginado, 20 por página) */
  @MessagePattern('get_fruits')
  async getAll(
    @Payload() payload: {
      page?: number;
      limit?: number;
      imageId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
      productorId?: string;
      campoIds?: string[];
    },
    @Ctx() context: RmqContext,
  ) {
    try {
      this.logger.debug(`get_fruits page=${payload.page ?? 1} limit=${payload.limit ?? 20}`);
      const sDate = payload.startDate ? new Date(payload.startDate) : undefined;

      let eDate = payload.endDate ? new Date(payload.endDate) : undefined;
      if (eDate) {
        eDate.setHours(23, 59, 59, 999);
      }

      return await this.fruitsService.findAll(
        payload?.page ?? 1,
        payload?.limit ?? 20,
        payload?.imageId,
        payload?.userId,
        sDate,
        eDate,
        { productorId: payload.productorId, campoIds: payload.campoIds },
      );
    } finally {
      this.ackRequest(context);
    }
  }

  /** Devuelve un análisis por su _id de MongoDB */
  @MessagePattern('get_fruit_by_id')
  async getById(
    @Payload() payload: { id: string; productorId?: string; campoIds?: string[] },
    @Ctx() context: RmqContext,
  ) {
    try {
      const analysis = await this.fruitsService.findById(payload.id);
      if (payload.productorId && analysis.productor_id?.toString() !== payload.productorId) {
        return null;
      }
      if (payload.campoIds?.length && !payload.campoIds.includes(analysis.campo_id?.toString() ?? '')) {
        return null;
      }
      return analysis;
    } catch {
      return null;
    } finally {
      this.ackRequest(context);
    }
  }

  /** Los request-reply se ackean siempre: si fallan, el error viaja en la respuesta. */
  private ackRequest(context: RmqContext) {
    const channel = context.getChannelRef() as Channel;
    channel.ack(context.getMessage() as Parameters<Channel['ack']>[0]);
  }
}
```

Nota: en `getAll` el `return` pasa a ser `return await` — necesario para que el `finally` haga ack después de resolver la promesa, no antes.

- [ ] **Step 5: Verificar que pasan (y que Task 1 sigue verde)**

```bash
pnpm run test -- fruits
```

Expected: PASS — los specs de `fruits.service`, `fruits.controller` e `inference-http.adapter`.

- [ ] **Step 6: Lint y commit**

```bash
pnpm run lint
git add src/config/envs.ts .env.example src/fruits/fruits.controller.ts src/fruits/fruits.controller.spec.ts
git commit -m "feat(fruit-ms): reintentos con backoff y ack/nack manual en nueva_fruta"
```

---

### Task 3: Topología DLX y transporte con `noAck: false` en `fruit-ms`

**Files:**
- Create: `fruit-ms/src/config/rabbitmq-topology.ts`
- Test (create): `fruit-ms/src/config/rabbitmq-topology.spec.ts`
- Modify: `fruit-ms/src/main.ts:11-21`

**Interfaces:**
- Consumes: `envs.rabbitmqUrl`, `envs.rabbitmqQueue` (existentes).
- Produces: `DLX_NAME = 'fruit.dlx'`, `dlqName(queue: string): string`, `deadLetterQueueArguments(queue: string): Record<string, string>`, `setupDeadLetterTopology(url: string, queue: string): Promise<void>`. La Task 4 replica los mismos argumentos en `fruit-backend` (valores literales, no importa este módulo).

- [ ] **Step 1: Escribir el test de la topología (falla)**

Crear `fruit-ms/src/config/rabbitmq-topology.spec.ts`:

```ts
import { connect } from 'amqplib';
import {
  DLX_NAME,
  deadLetterQueueArguments,
  dlqName,
  setupDeadLetterTopology,
} from './rabbitmq-topology';

jest.mock('amqplib', () => ({ connect: jest.fn() }));

describe('rabbitmq-topology', () => {
  it('dlqName y deadLetterQueueArguments derivan del nombre de la cola', () => {
    expect(dlqName('ingestion_queue')).toBe('ingestion_queue.dlq');
    expect(deadLetterQueueArguments('ingestion_queue')).toEqual({
      'x-dead-letter-exchange': 'fruit.dlx',
      'x-dead-letter-routing-key': 'ingestion_queue.dlq',
    });
  });

  describe('setupDeadLetterTopology', () => {
    let channel: any;
    let connection: any;

    beforeEach(() => {
      channel = {
        assertExchange: jest.fn().mockResolvedValue(undefined),
        assertQueue: jest.fn().mockResolvedValue(undefined),
        bindQueue: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
      };
      connection = {
        createChannel: jest.fn().mockResolvedValue(channel),
        close: jest.fn().mockResolvedValue(undefined),
      };
      (connect as jest.Mock).mockResolvedValue(connection);
    });

    it('declara exchange, DLQ y binding, y cierra la conexión', async () => {
      await setupDeadLetterTopology('amqp://localhost', 'ingestion_queue');

      expect(channel.assertExchange).toHaveBeenCalledWith(DLX_NAME, 'direct', {
        durable: true,
      });
      expect(channel.assertQueue).toHaveBeenCalledWith('ingestion_queue.dlq', {
        durable: true,
      });
      expect(channel.bindQueue).toHaveBeenCalledWith(
        'ingestion_queue.dlq',
        DLX_NAME,
        'ingestion_queue.dlq',
      );
      expect(connection.close).toHaveBeenCalled();
    });

    it('cierra la conexión aunque la declaración falle', async () => {
      channel.assertExchange.mockRejectedValue(new Error('boom'));

      await expect(
        setupDeadLetterTopology('amqp://localhost', 'q'),
      ).rejects.toThrow('boom');
      expect(connection.close).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Verificar que falla**

```bash
pnpm run test -- rabbitmq-topology
```

Expected: FAIL — `Cannot find module './rabbitmq-topology'`.

- [ ] **Step 3: Implementar `rabbitmq-topology.ts`**

Crear `fruit-ms/src/config/rabbitmq-topology.ts`:

```ts
import { Logger } from '@nestjs/common';
import { connect } from 'amqplib';

export const DLX_NAME = 'fruit.dlx';

export const dlqName = (queue: string) => `${queue}.dlq`;

/**
 * Argumentos de declaración de la cola principal. Deben coincidir exactamente
 * con los que usan los clientes RMQ de fruit-backend (ingestion y fruits-query):
 * RabbitMQ rechaza con PRECONDITION_FAILED cualquier redeclaración distinta.
 */
export const deadLetterQueueArguments = (queue: string) => ({
  'x-dead-letter-exchange': DLX_NAME,
  'x-dead-letter-routing-key': dlqName(queue),
});

/**
 * Declara la topología de dead-lettering: exchange fruit.dlx (direct, durable),
 * cola <queue>.dlq (durable) y su binding. Idempotente: assert* no falla si
 * los recursos ya existen con los mismos parámetros.
 */
export async function setupDeadLetterTopology(
  url: string,
  queue: string,
): Promise<void> {
  const logger = new Logger('RabbitTopology');
  const connection = await connect(url);
  try {
    const channel = await connection.createChannel();
    await channel.assertExchange(DLX_NAME, 'direct', { durable: true });
    await channel.assertQueue(dlqName(queue), { durable: true });
    await channel.bindQueue(dlqName(queue), DLX_NAME, dlqName(queue));
    await channel.close();
    logger.log(`Topología DLX lista: ${DLX_NAME} → ${dlqName(queue)}`);
  } finally {
    await connection.close();
  }
}
```

- [ ] **Step 4: Verificar que pasa**

```bash
pnpm run test -- rabbitmq-topology
```

Expected: PASS (3 tests).

- [ ] **Step 5: Activar ack manual y DLX en `main.ts`**

En `fruit-ms/src/main.ts`, añadir el import:

```ts
import { deadLetterQueueArguments, setupDeadLetterTopology } from './config/rabbitmq-topology';
```

Y reemplazar el bloque `app.connectMicroservice(...)` (líneas 11-21) por:

```ts
  // La topología DLX debe existir antes de que Nest declare la cola principal
  // con argumentos que apuntan a ella.
  await setupDeadLetterTopology(envs.rabbitmqUrl, envs.rabbitmqQueue);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [envs.rabbitmqUrl],
        queue: envs.rabbitmqQueue,
        // Ack manual: el controller decide ack (éxito) o nack → DLQ (agotados
        // los reintentos). prefetchCount > 1 evita que un mensaje en backoff
        // bloquee los request-reply get_fruits/get_fruit_by_id de la misma cola.
        noAck: false,
        prefetchCount: 5,
        queueOptions: {
          durable: true,
          arguments: deadLetterQueueArguments(envs.rabbitmqQueue),
        },
      },
    },
    { inheritAppConfig: true },
  );
```

- [ ] **Step 6: Build, tests completos y commit**

```bash
pnpm run build
pnpm run test
pnpm run lint
git add src/config/rabbitmq-topology.ts src/config/rabbitmq-topology.spec.ts src/main.ts
git commit -m "feat(fruit-ms): topología DLX fruit.dlx y transporte RMQ con ack manual"
```

Expected: build sin errores; todos los specs de `fruit-ms` en verde.

---

### Task 4: Clientes RMQ de `fruit-backend` — argumentos DLX y publicación persistente

**Files:**
- Create: `fruit-backend/src/config/rmq-queue-options.ts`
- Modify: `fruit-backend/src/ingestion/ingestion.module.ts:19-25`
- Modify: `fruit-backend/src/fruits-query/fruits-query.module.ts:15-19`

**Interfaces:**
- Consumes: `envs.rabbitmqQueue` de `fruit-backend/src/config/envs.ts` (existente). Valores DLX literales idénticos a los de `fruit-ms` (Task 3): exchange `fruit.dlx`, routing key `<queue>.dlq`.
- Produces: `fruitsQueueOptions` (objeto `queueOptions` compartido por ambos módulos cliente).

- [ ] **Step 1: Crear las opciones de cola compartidas**

Crear `fruit-backend/src/config/rmq-queue-options.ts`:

```ts
import { envs } from './envs';

/**
 * Opciones de declaración de la cola de fruit-ms. Los argumentos DLX deben
 * coincidir exactamente con fruit-ms/src/config/rabbitmq-topology.ts:
 * RabbitMQ rechaza con PRECONDITION_FAILED cualquier redeclaración distinta.
 */
export const fruitsQueueOptions = {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'fruit.dlx',
    'x-dead-letter-routing-key': `${envs.rabbitmqQueue}.dlq`,
  },
};
```

- [ ] **Step 2: Ingestion — persistent + opciones compartidas**

En `fruit-backend/src/ingestion/ingestion.module.ts`, añadir el import:

```ts
import { fruitsQueueOptions } from '../config/rmq-queue-options';
```

Y reemplazar el bloque `options` del cliente (líneas 19-25) por:

```ts
        options: {
          urls: [envs.rabbitmqUrl],
          queue: envs.rabbitmqQueue,
          // Mensajes persistentes: la cola es durable, sin esto un reinicio
          // del broker pierde los eventos nueva_fruta encolados.
          persistent: true,
          queueOptions: fruitsQueueOptions,
        },
```

- [ ] **Step 3: Fruits-query — opciones compartidas**

En `fruit-backend/src/fruits-query/fruits-query.module.ts`, añadir el import:

```ts
import { fruitsQueueOptions } from '../config/rmq-queue-options';
```

Y reemplazar el bloque `options` (líneas 15-19) por:

```ts
        options: {
          urls: [envs.rabbitmqUrl],
          queue: envs.rabbitmqQueue,
          queueOptions: fruitsQueueOptions,
        },
```

(Sin `persistent`: es request-reply efímero.)

- [ ] **Step 4: Verificar build y lint**

```bash
cd fruit-backend
pnpm run build
pnpm run lint
```

Expected: build y lint sin errores. (No se ejecuta la suite completa: los 11 tests que fallan en `fcm`/`solicitudes` son preexistentes y ajenos a este cambio.)

- [ ] **Step 5: Commit**

```bash
git add src/config/rmq-queue-options.ts src/ingestion/ingestion.module.ts src/fruits-query/fruits-query.module.ts
git commit -m "feat(fruit-backend): clientes RMQ con argumentos DLX y publicación persistente en ingestion"
```

---

### Task 5: Documentación de despliegue y verificación E2E

**Files:**
- Modify: `README.md` (raíz — añadir sección al final)
- Modify: `CLAUDE.md` (raíz — un bullet en Key Conventions)

**Interfaces:**
- Consumes: toda la funcionalidad de Tasks 1-4 desplegable con `docker compose`.
- Produces: documentación operativa; verificación manual del flujo completo reintentos → DLQ.

- [ ] **Step 1: Documentar la operación en el README raíz**

Añadir al final de `README.md`:

````markdown
## Mensajería: reintentos y cola de muertos (DLQ)

`fruit-ms` procesa `nueva_fruta` con ack manual y reintentos (3 intentos,
backoff exponencial 2 s / 8 s, configurable con `NUEVA_FRUTA_MAX_ATTEMPTS` y
`NUEVA_FRUTA_BACKOFF_BASE_MS`). Si se agotan, el mensaje va al exchange
`fruit.dlx` y termina en la cola `ingestion_queue.dlq`, donde queda a la
espera de inspección manual.

### Despliegue inicial (una vez por entorno)

La cola existente se declaró sin argumentos DLX y RabbitMQ no permite
redeclararla distinta (`PRECONDITION_FAILED`). Con `fruit-backend` y
`fruit-ms` detenidos:

```bash
docker compose exec rabbitmq rabbitmqctl delete_queue ingestion_queue
```

Al arrancar de nuevo, `fruit-ms` recrea la cola con los argumentos DLX y
declara `fruit.dlx` + `ingestion_queue.dlq`. Los mensajes encolados en el
momento del borrado se pierden: hacerlo en ventana de baja actividad.

### Inspeccionar y recuperar mensajes muertos

- Management UI (`http://localhost:15672`, guest/guest) → Queues →
  `ingestion_queue.dlq` → *Get messages*. El payload identifica la imagen
  (`image_id`, `storage_key`) y el header `x-death` registra motivo, cola de
  origen y timestamp.
- Para reprocesar: una vez resuelta la causa raíz, re-publicar el payload en
  la cola `ingestion_queue` desde la UI (*Publish message*, propiedad
  `delivery_mode: 2`). El índice único sparse de `offline_sync_id` protege
  contra duplicados si el análisis llegó a persistirse.
````

- [ ] **Step 2: Actualizar CLAUDE.md**

En `CLAUDE.md`, sección **Key Conventions**, añadir el bullet:

```markdown
- **Mensajería resiliente**: `nueva_fruta` se consume con ack manual (`noAck: false`, prefetch 5), 3 reintentos con backoff exponencial y dead-lettering a `fruit.dlx` → `<queue>.dlq`; los clientes de fruit-backend declaran la cola con los mismos argumentos DLX (deben coincidir siempre)
```

- [ ] **Step 3: Verificación E2E del camino feliz y del camino a DLQ**

Con Docker corriendo:

```bash
# 1. Infra + stack (desde la raíz del workspace)
docker compose up -d --build rabbitmq postgres fruit-backend fruit-ms fruit-inference

# 2. Borrar la cola vieja (solo la primera vez; requiere reiniciar consumidores después)
docker compose stop fruit-backend fruit-ms
docker compose exec rabbitmq rabbitmqctl delete_queue ingestion_queue
docker compose start fruit-backend fruit-ms

# 3. Confirmar topología: la cola principal con args DLX y la DLQ existente
docker compose exec rabbitmq rabbitmqctl list_queues name messages arguments
```

Expected: `ingestion_queue` lista `x-dead-letter-exchange: fruit.dlx` y aparece `ingestion_queue.dlq` con 0 mensajes.

```bash
# 4. Simular caída de inferencia y disparar un análisis
docker compose stop fruit-inference
# Subir una imagen desde la app Flutter, o vía curl con un JWT válido:
#   curl -X POST http://localhost:3001/api/v1/ingestion -H "Authorization: Bearer <token>" -F "file=@foto.jpg"

# 5. Observar los reintentos en los logs de fruit-ms (~10 s en total)
docker compose logs -f fruit-ms
```

Expected: dos warnings `nueva_fruta intento 1/3... reintento en 2000 ms` y `intento 2/3... en 8000 ms`, luego el error `agotó 3 intentos, enviando a DLQ`.

```bash
# 6. Confirmar que el mensaje está en la DLQ
docker compose exec rabbitmq rabbitmqctl list_queues name messages
```

Expected: `ingestion_queue.dlq  1`.

```bash
# 7. Recuperación: levantar inferencia y re-publicar desde la Management UI
docker compose start fruit-inference
# UI http://localhost:15672 → ingestion_queue.dlq → Get messages → copiar payload
# → Queues → ingestion_queue → Publish message (delivery_mode: 2)
```

Expected: fruit-ms procesa el mensaje (`Análisis guardado | id=...`) y la DLQ vuelve a 0 (tras Get messages con requeue=false o purga manual).

```bash
# 8. Camino feliz: subir otra imagen con todo arriba
```

Expected: procesamiento normal sin reintentos; `ingestion_queue` vuelve a 0 mensajes (ack correcto) y las queries del dashboard (`get_fruits`) siguen respondiendo.

- [ ] **Step 4: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: despliegue y operación de la DLQ de nueva_fruta"
```
