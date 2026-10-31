import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, RedisCacheService } from './redis-cache.service';

/**
 * Crea el cliente y arranca connect() en segundo plano. Con lazyConnect el
 * primer comando dispararía la conexión pero, al no haber cola offline, fallaría
 * (se perdería p. ej. la primera invalidación del dashboard). Los errores de
 * connect() ya se registran en el listener 'error' y retryStrategy reintenta.
 */
export function createRedisClient(url: string): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 500, 5000),
  });
  void client.connect().catch(() => {});
  return client;
}

/**
 * Módulo global de cache. enableOfflineQueue: false hace que los comandos
 * fallen rápido mientras Redis no esté listo (p. ej. dev local sin Docker)
 * en vez de encolar y bloquear; la conexión la inicia createRedisClient.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        createRedisClient(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
    RedisCacheService,
  ],
  exports: [RedisCacheService],
})
export class CacheModule {}
