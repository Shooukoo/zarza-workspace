import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudMuestreo, SolicitudMuestreoSchema } from './schemas/solicitud-muestreo.schema';
import { AuthModule } from '../auth/infrastructure/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CamposModule } from '../campos/campos.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SolicitudMuestreo.name, schema: SolicitudMuestreoSchema },
    ]),
    AuthModule,
    NotificationsModule,
    CamposModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
