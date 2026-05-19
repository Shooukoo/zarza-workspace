import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { InternalNotifyController } from './internal-notify.controller';
import { AuthModule } from '../auth/infrastructure/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [InternalNotifyController],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
