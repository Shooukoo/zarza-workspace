import { InternalNotifyController } from './internal-notify.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { FcmService } from '../fcm/fcm.service';
import { RedisCacheService } from '../cache/redis-cache.service';
import type { IUserRepository } from '../auth/ports/user-repository.port';
import type { FastifyRequest } from 'fastify';
import { AppLogger } from '../common/logging/app.logger';

const mockReq = { ip: '127.0.0.1', headers: {} } as FastifyRequest;
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('InternalNotifyController — invalidación de cache', () => {
  const TOKEN = 'test-internal-token';
  let gateway: { emitToUser: jest.Mock };
  let fcmService: { sendToDevice: jest.Mock };
  let userRepository: { findFcmTokenById: jest.Mock; clearFcmToken: jest.Mock };
  let notificationsService: { create: jest.Mock };
  let cache: { invalidatePrefix: jest.Mock };
  let controller: InternalNotifyController;

  beforeEach(() => {
    process.env.INTERNAL_NOTIFY_TOKEN = TOKEN;
    gateway = { emitToUser: jest.fn() };
    fcmService = { sendToDevice: jest.fn().mockResolvedValue(undefined) };
    userRepository = {
      findFcmTokenById: jest.fn().mockResolvedValue(null),
      clearFcmToken: jest.fn(),
    };
    notificationsService = { create: jest.fn().mockResolvedValue(undefined) };
    cache = { invalidatePrefix: jest.fn().mockResolvedValue(undefined) };
    controller = new InternalNotifyController(
      gateway as NotificationsGateway,
      fcmService as FcmService,
      userRepository as IUserRepository,
      notificationsService as NotificationsService,
      cache as RedisCacheService,
      mockLogger as AppLogger,
    );
  });

  it('analisis_listo invalida el prefijo dash:', async () => {
    await controller.notify(
      TOKEN,
      { event: 'analisis_listo', data: { userId: 'u1' } },
      mockReq,
    );

    expect(cache.invalidatePrefix).toHaveBeenCalledWith('dash:');
  });

  it('otros eventos no tocan el cache', async () => {
    await controller.notify(
      TOKEN,
      { event: 'nueva_solicitud', data: { userId: 'u1' } },
      mockReq,
    );

    expect(cache.invalidatePrefix).not.toHaveBeenCalled();
  });

  it('token inválido: rechaza sin invalidar', async () => {
    await expect(
      controller.notify(
        'token-malo',
        { event: 'analisis_listo', data: {} },
        mockReq,
      ),
    ).rejects.toThrow();

    expect(cache.invalidatePrefix).not.toHaveBeenCalled();
  });
});
