import { Module } from '@nestjs/common';
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
import { SolicitudesModule } from './solicitudes/solicitudes.module';
import { AnalysesModule } from './analyses/analyses.module';
import { FcmModule } from './fcm/fcm.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 1000 },
      { name: 'auth',   ttl: 60000, limit: 10 },   // 10 intentos/min en endpoints de auth
    ]),
    FcmModule,
    AuthModule,
    AdminModule,
    IngestionModule,
    FruitsQueryModule,
    NotificationsModule,
    CamposModule,
    SolicitudesModule,
    AnalysesModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
