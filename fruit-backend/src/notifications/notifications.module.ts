import { Module } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import {
  NotificationsGateway,
  WS_ALLOWED_ORIGINS,
} from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { InternalNotifyController } from './internal-notify.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { envs } from '../config/envs';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, InternalNotifyController],
  providers: [
    NotificationsGateway,
    {
      provide: WS_ALLOWED_ORIGINS,
      useValue: envs.corsOrigin.split(',').map((s) => s.trim()),
    },
    NotificationsService,
    NotificationRepository,
    PrismaService,
  ],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
