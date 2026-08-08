import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Headers,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import { RedisCacheService } from '../cache/redis-cache.service';
import { AppLogger } from '../common/logging/app.logger';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Internal')
@Controller('internal')
export class InternalNotifyController {
  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
    private readonly notificationsService: NotificationsService,
    private readonly cache: RedisCacheService,
    private readonly logger: AppLogger,
  ) {}

  @Post('notify')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Send an internal notification',
    description:
      'Receives an internal event and processes WebSocket, database, and FCM notifications.',
  })
  @ApiHeader({
    name: 'x-internal-token',
    required: true,
    description:
      'Internal token used to authorize service-to-service notifications.',
    example: 'your-internal-token',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          example: 'analisis_listo',
          description: 'Notification event type.',
        },
        data: {
          type: 'object',
          example: {
            userId: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
          },
          description: 'Event-specific notification data.',
        },
      },
      required: ['event', 'data'],
    },
  })
  @ApiResponse({
    status: 204,
    description: 'Notification processed successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or missing internal token.',
  })
  async notify(
    @Headers('x-internal-token') token: string,
    @Body() body: { event: string; data: Record<string, unknown> },
    @Req() req: FastifyRequest,
  ) {
    const origin = this.requestOrigin(req);
    const expected = process.env.INTERNAL_NOTIFY_TOKEN;
    if (!expected || token !== expected) {
      this.logger.warn('Token interno inválido', {
        origin,
      });
      throw new UnauthorizedException('Invalid internal token');
    }

    this.logger.info('Notificación interna recibida', {
      event: body.event,
      origin,
    });

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

  // Sin trustProxy, req.ip es la IP de la conexión directa (el proxy si lo
  // hay); se registra también x-forwarded-for para conservar la IP original.
  private requestOrigin(req: FastifyRequest): string {
    const xff = req.headers?.['x-forwarded-for'];
    const xffValue = Array.isArray(xff) ? xff.join(',') : xff;
    return `ip=${req.ip ?? '-'} xff=${xffValue ?? '-'}`;
  }

  private async sendAnalisisPush(data: Record<string, unknown>): Promise<void> {
    const userId = data?.userId as string | undefined;
    this.logger.info('Notificación de análisis procesada', {
      userId: userId ?? null,
    });
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
        this.logger.info('Token FCM inválido eliminado', {
          userId,
        });
      }
    }
  }
}
