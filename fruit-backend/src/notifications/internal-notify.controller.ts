import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Logger,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import { RedisCacheService } from '../cache/redis-cache.service';

@Controller('internal')
export class InternalNotifyController {
  private readonly logger = new Logger(InternalNotifyController.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly notificationsService: NotificationsService,
    private readonly cache: RedisCacheService,
  ) {}

  @Post('notify')
  @HttpCode(204)
  async notify(
    @Headers('x-internal-token') token: string,
    @Body() body: { event: string; data: Record<string, unknown> },
  ) {
    const expected = process.env.INTERNAL_NOTIFY_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid internal token');
    }

    // Un análisis nuevo cambia las métricas del dashboard: invalida su cache.
    if (body.event === 'analisis_listo') {
      await this.cache.invalidatePrefix('dash:');
    }

    const userId = body.data?.userId as string | undefined;
    const eventType = body.event;

    // Mapeo de evento → título/body (debe coincidir con el snackbar de Flutter)
    let title = '';
    let bodyText = '';
    switch (eventType) {
      case 'analisis_listo':
        title = '¡Análisis listo!';
        bodyText = 'Tu análisis ya está disponible en el historial.';
        break;
      case 'analysis_validated':
        title =
          (body.data?.action as string) === 'validado'
            ? 'Análisis validado ✓'
            : 'Análisis rechazado';
        bodyText =
          (body.data?.action as string) === 'validado'
            ? 'Un agrónomo validó tu análisis.'
            : 'Un agrónomo rechazó tu análisis. Revisa las observaciones.';
        break;
      case 'nueva_solicitud':
        title = 'Nueva solicitud de muestreo';
        bodyText =
          'Tienes una nueva solicitud asignada. Revísala en Solicitudes.';
        break;
      default:
        title = 'Notificación';
        bodyText = '';
    }

    // Persiste en DB
    if (userId && title) {
      await this.notificationsService.create(
        userId,
        eventType,
        title,
        bodyText,
        body.data,
      );
    } else {
      // Si no hay titulo mapeado, solo envía WS sin persistir
      if (userId) this.gateway.emitToUser(userId, eventType, body.data);
    }

    // Envía push FCM
    if (eventType === 'analisis_listo') {
      await this.sendAnalisisPush(body.data);
    }
  }

  private async sendAnalisisPush(data: Record<string, unknown>): Promise<void> {
    const userId = data?.userId as string | undefined;
    this.logger.log(`[notify] analisis_listo → userId=${userId ?? 'none'}`);
    if (!userId) return;

    const fcmToken = await this.userRepository.findFcmTokenById(userId);
    if (!fcmToken) return;

    try {
      await this.fcmService.sendToDevice(fcmToken, {
        title: '¡Análisis listo!',
        body: 'Tu análisis de frutos ya está disponible en el historial.',
      });
    } catch (e) {
      if (e instanceof FcmTokenInvalidError) {
        await this.userRepository.clearFcmToken(userId);
        this.logger.log(`[FCM] Token inválido limpiado para usuario ${userId}`);
      }
    }
  }
}
