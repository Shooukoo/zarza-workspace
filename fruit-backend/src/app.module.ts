import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TraceMiddleware } from './common/logging/trace.middleware';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@rubus/database';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestionModule } from './ingestion/ingestion.module';
import { FruitsQueryModule } from './fruits-query/fruits-query.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/infrastructure/auth.module';
import { AdminModule } from './admin/admin.module';
import { CamposModule } from './campos/campos.module';
import { MapasCalorModule } from './mapas-calor/mapas-calor.module';
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AnalysesModule } from './analyses/analyses.module';
import { TrainingModule } from './training/training.module';
import { FcmModule } from './fcm/fcm.module';
import { HealthController } from './health/health.controller';
import { CacheModule } from './cache/cache.module';
import { LoggerModule } from 'nestjs-pino';
import { LoggingModule } from './common/logging/logging.module';
import { envs } from './config/envs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: envs.logLevel,
        autoLogging: false,
        base: {
          service: 'fruit-backend',
        },
        messageKey: 'message',

        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,

        formatters: {
          level(label) {
            return { level: label.toUpperCase() };
          },
        },
        serializers: {
          req: () => undefined,
          res: () => undefined,
          err: () => undefined,
        },
      },
    }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 1000 },
      { name: 'auth', ttl: 60000, limit: 10 }, // 10 intentos/min en endpoints de auth
    ]),
    CacheModule,
    FcmModule,
    AuthModule,
    AdminModule,
    IngestionModule,
    FruitsQueryModule,
    NotificationsModule,
    CamposModule,
    MapasCalorModule,
    SolicitudesModule,
    AnalysesModule,
    TrainingModule,
    LoggingModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceMiddleware).forRoutes('{*path}');
  }
}
