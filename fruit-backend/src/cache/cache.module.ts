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
