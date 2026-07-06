import { Module } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationRepository } from './notification.repository';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationRepository,
    PrismaService,
  ],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
