import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type Redis from 'ioredis';
import { AppLogger } from '../common/logging/app.logger';

/** Token de inyección del cliente ioredis (permite mockearlo en tests). */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Cache de lectura sobre Redis con degradación elegante:
 * si Redis no está disponible, toda lectura cae al cómputo
 * directo contra la base de datos y se loguea un warning.
 */
@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly logger: AppLogger,
  ) {
    // Sin listener, un error de conexión emitido por ioredis tumba el proceso.
    this.redis.on('error', (err: Error) => {
      this.logger.warn('Redis no disponible', {
        error: err.message,
      });
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
      this.logger.warn('Cache GET falló, se calculará desde la base de datos', {
        key,
        error: (err as Error).message,
      });
      return compute();
    }

    const value = await compute();
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn('Cache SET falló', {
        key,
        error: (err as Error).message,
      });
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
      this.logger.warn('Invalidación de cache falló', {
        prefix,
        error: (err as Error).message,
      });
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
