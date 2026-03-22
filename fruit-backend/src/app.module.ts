import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IngestionModule } from './ingestion/ingestion.module';
import { FruitsQueryModule } from './fruits-query/fruits-query.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/infrastructure/auth.module';
import { AdminModule } from './admin/admin.module';
import { envs } from './config/envs';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(envs.mongoUri),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 1000,
      },
    ]),
    AuthModule,
    AdminModule,
    IngestionModule,
    FruitsQueryModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
