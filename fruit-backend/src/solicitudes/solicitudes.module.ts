import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudMuestreo, SolicitudMuestreoSchema } from './schemas/solicitud-muestreo.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SolicitudMuestreo.name, schema: SolicitudMuestreoSchema },
    ]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
