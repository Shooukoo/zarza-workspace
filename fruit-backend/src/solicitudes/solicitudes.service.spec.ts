import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
import { SolicitudesService } from './solicitudes.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { FcmService, FcmTokenInvalidError } from '../fcm/fcm.service';
import { I_USER_REPOSITORY } from '../auth/ports/user-repository.port';
import { CamposService } from '../campos/campos.service';

const mockPrisma = {
  solicitudMuestreo: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  userCampo: {
    findMany: jest.fn(),
  },
};

const mockGateway = { emitToUser: jest.fn() };

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
      { provide: PrismaService, useValue: mockPrisma },
      { provide: NotificationsGateway, useValue: mockGateway },
      { provide: FcmService, useValue: mockFcmService },
      { provide: I_USER_REPOSITORY, useValue: mockUserRepo },
      { provide: CamposService, useValue: mockCamposService },
    ],
  }).compile();
  return module.get(SolicitudesService);
}

const CAMPO_ID   = 'a1a1a1a1-0000-0000-0000-000000000001';
const MONITOR_ID = 'b2b2b2b2-0000-0000-0000-000000000001';
const SOL_ID     = 'c3c3c3c3-0000-0000-0000-000000000001';

describe('SolicitudesService — FCM integration', () => {
  let service: SolicitudesService;

  beforeEach(async () => {
    service = await buildModule();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    const dto = {
      campo_id: CAMPO_ID,
      asignado_a: MONITOR_ID,
      mensaje: 'Muestreo urgente',
      fecha_limite: '2026-05-10',
    };
    const fakeSolicitud = { id: SOL_ID, campoId: CAMPO_ID, asignadoAId: MONITOR_ID, estado: 'PENDIENTE' };

    beforeEach(() => {
      mockPrisma.solicitudMuestreo.create.mockResolvedValue(fakeSolicitud);
      mockPrisma.userCampo.findMany.mockResolvedValue([]);
      mockCamposService.findById.mockResolvedValue({ nombre: 'Finca El Rosal' });
    });

    it('sends push with campo nombre and fecha_limite when user has fcm_token', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');

      await service.create('admin-id', dto);

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
        title: 'Nueva solicitud: Finca El Rosal',
        body: 'Fecha límite: 10/05/2026. Abre la app para ver detalles.',
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

    it('emite nueva_solicitud al monitor asignado', async () => {
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      mockPrisma.userCampo.findMany.mockResolvedValue([]);

      await service.create('admin-id', dto);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        MONITOR_ID,
        'nueva_solicitud',
        expect.objectContaining({ solicitud_id: SOL_ID }),
      );
    });

    it('emite nueva_solicitud a cada agrónomo del campo', async () => {
      const AGRONOMO_ID = 'd4d4d4d4-0000-0000-0000-000000000001';
      mockUserRepo.findFcmTokenById.mockResolvedValue(null);
      mockPrisma.userCampo.findMany.mockResolvedValue([
        { userId: AGRONOMO_ID },
      ]);

      await service.create('admin-id', dto);

      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        AGRONOMO_ID,
        'nueva_solicitud',
        expect.objectContaining({ solicitud_id: SOL_ID }),
      );
    });
  });

  describe('updateEstado()', () => {
    const fakeSolicitud = {
      id: SOL_ID,
      asignadoAId: MONITOR_ID,
      campoId: CAMPO_ID,
      estado: 'CANCELADO',
    };

    beforeEach(() => {
      mockPrisma.solicitudMuestreo.findUnique.mockResolvedValue(fakeSolicitud);
      mockPrisma.solicitudMuestreo.update.mockResolvedValue(fakeSolicitud);
      mockCamposService.findById.mockResolvedValue({ nombre: 'Finca El Rosal' });
      mockUserRepo.findFcmTokenById.mockResolvedValue('token-monitor');
    });

    it('sends push on CANCELADO', async () => {
      await service.updateEstado(SOL_ID, 'CANCELADO');

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
        title: 'Solicitud cancelada: Finca El Rosal',
        body: 'La solicitud de muestreo fue cancelada.',
      });
    });

    it('sends push on COMPLETADO', async () => {
      mockPrisma.solicitudMuestreo.update.mockResolvedValue({ ...fakeSolicitud, estado: 'COMPLETADO' });

      await service.updateEstado(SOL_ID, 'COMPLETADO');

      expect(mockFcmService.sendToDevice).toHaveBeenCalledWith('token-monitor', {
        title: 'Solicitud completada: Finca El Rosal',
        body: 'El análisis ha sido marcado como completado.',
      });
    });

    it('does NOT send push on EN_PROGRESO', async () => {
      mockPrisma.solicitudMuestreo.update.mockResolvedValue({ ...fakeSolicitud, estado: 'EN_PROGRESO' });

      await service.updateEstado(SOL_ID, 'EN_PROGRESO');

      expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
    });

    it('does NOT send push on PENDIENTE', async () => {
      mockPrisma.solicitudMuestreo.update.mockResolvedValue({ ...fakeSolicitud, estado: 'PENDIENTE' });

      await service.updateEstado(SOL_ID, 'PENDIENTE');

      expect(mockFcmService.sendToDevice).not.toHaveBeenCalled();
    });
  });
});
