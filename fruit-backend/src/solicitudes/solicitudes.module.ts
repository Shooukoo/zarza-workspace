import { Module } from '@nestjs/common';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CamposModule } from '../campos/campos.module';

@Module({
  imports: [AuthModule, NotificationsModule, CamposModule],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
