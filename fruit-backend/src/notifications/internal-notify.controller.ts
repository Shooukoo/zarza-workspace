import { Body, Controller, HttpCode, Inject, Logger, Post, Headers, UnauthorizedException } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';

@Controller('internal')
export class InternalNotifyController {
  private readonly logger = new Logger(InternalNotifyController.name);

  constructor(
    private readonly gateway: NotificationsGateway,
    private readonly fcmService: FcmService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
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
    const userId = body.data?.userId as string | undefined;
    if (userId) {
      this.gateway.emitToUser(userId, body.event, body.data);
    }

    if (body.event === 'analisis_listo') {
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
