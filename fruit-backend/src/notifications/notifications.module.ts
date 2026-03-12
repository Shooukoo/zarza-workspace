import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  providers: [NotificationsGateway],
  exports: [NotificationsGateway], // exportado para que IngestionService pueda inyectarlo
})
export class NotificationsModule {}
