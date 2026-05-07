import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudMuestreo } from './schemas/solicitud-muestreo.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

const mockSolicitudModel = {
  create: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};

const mockGateway = { broadcast: jest.fn() };

const mockFcmService = {
  sendToDevice: jest.fn(),
};

const mockUserRepo = {
  findFcmTokenById: jest.fn(),
  clearFcmToken: jest.fn(),
};

const mockCamposService = {
  findById: jest.fn(),
};

async function buildModule(): Promise<SolicitudesService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SolicitudesService,
      { provide: getModelToken(SolicitudMuestreo.name), useValue: mockSolicitudModel },
      { provide: NotificationsGateway, useValue: mockGateway },
      { provide: FcmService, useValue: mockFcmService },
      { provide: I_USER_REPOSITORY, useValue: mockUserRepo },
      { provide: CamposService, useValue: mockCamposService },
    ],
  }).compile();
  return module.get(SolicitudesService);
}

describe('SolicitudesService — FCM integration', () => {
  let service: SolicitudesService;

  beforeEach(async () => {
    service = await buildModule();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const dto = {
      campo_id: '6630000000000000000000a1',
      asignado_a: '6630000000000000000000b1',
      mensaje: 'Muestreo urgente',
      fecha_limite: '2026-05-10',
    };
    const fakeSolicitud = { _id: 'sol1', ...dto, estado: 'PENDIENTE' };

    beforeEach(() => {
      mockSolicitudModel.create.mockResolvedValue(fakeSolicitud);
      mockCamposService.findById.mockResolvedValue({ nombre: 'Finca El Rosal' });
    });

    it('sends push with campo nombre and fecha_limite when user has fcm_token', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
        title: 'Nueva solicitud: Finca El Rosal',
        body: 'Fecha límite: 10/5/2026. Abre la app para ver detalles.',
      });
    });

    it('logs warning and does NOT send push when user has no fcm_token', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('sin token registrado'),
      );
    });

    it('clears fcm_token when FcmTokenInvalidError is thrown', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('expired-token');
      mockFcmService.sendToDevice.mockRejectedValue(
        new FcmTokenInvalidError('expired-token'),
      );

      await service.create('admin-id', dto);

      expect(mockUserRepo.clearFcmToken).toHaveBeenCalledWith(dto.asignado_a);
    });

    it('uses campo_id as fallback title when campo not found', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');
      mockCamposService.findById.mockRejectedValue(new Error('Not found'));

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith(
        'token-monitor',
        expect.objectContaining({ title: expect.stringContaining(dto.campo_id) }),
      );
    });
  });
});
