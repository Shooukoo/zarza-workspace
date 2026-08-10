import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

jest.mock('../config/envs', () => ({
  envs: {
    backendUrl: 'http://fruit-backend:3000',
    internalNotifyToken: 'x'.repeat(32),
  },
}));

describe('FruitsService.process', () => {
  const dto = { image_id: 'img-1', storage_key: 'k1' } as NuevaFrutaDto;

  const analysis = {
    image_id: 'img-1',
    campo_id: null,
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 100 },
    cronograma_fenologico: [],
  };

  let inference: { analyze: jest.Mock };
  let repo: { save: jest.Mock; findAll: jest.Mock; findById: jest.Mock };
  let http: { axiosRef: { post: jest.Mock } };

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  let service: FruitsService;

  beforeEach(() => {
    inference = { analyze: jest.fn().mockResolvedValue(analysis) };
    repo = {
      save: jest.fn().mockResolvedValue('saved-id'),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    http = { axiosRef: { post: jest.fn().mockResolvedValue({}) } };
    service = new FruitsService(
      inference as any,
      repo as any,
      http as any,
      logger as any,
    );
  });

  it('procesa una nueva fruta, guarda el análisis y notifica al backend', async () => {
    const processedAnalysis = {
      image_id: 'img-1',
      storage_key: 'k1',
      requester: {
        userId: 'user-1',
        email: 'user@example.com',
      },
      variedad: 'Hass',
      fecha_analisis: new Date('2026-08-09T12:00:00.000Z'),
      metricas_salud: {
        total_elementos_detectados: 10,
        elementos_sanos: 8,
        elementos_enfermos: 2,
        porcentaje_merma_general: 20,
      },
      proyeccion_financiera: {
        peso_sano_gramos: 1500,
      },
      cronograma_fenologico: [],
      campo_id: 'campo-1',
      productor_id: 'producer-1',
      ubicacion_gps: {
        type: 'Point',
        coordinates: [-102.123, 19.456],
      },
      offline_sync_id: 'offline-123',
      validacion_experto: null,
    };

    inference.analyze.mockResolvedValue(processedAnalysis);
    repo.save.mockResolvedValue('analysis-123');

    await service.process({
      image_id: 'img-1',
      storage_key: 'k1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      campoId: 'campo-1',
      productorId: 'producer-1',
      gpsLat: 19.456,
      gpsLon: -102.123,
      offlineSyncId: 'offline-123',
    } as NuevaFrutaDto);

    expect(inference.analyze).toHaveBeenCalledWith(
      'img-1',
      'k1',
      {
        userId: 'user-1',
        email: 'user@example.com',
      },
      {
        campoId: 'campo-1',
        productorId: 'producer-1',
        gpsLat: 19.456,
        gpsLon: -102.123,
        offlineSyncId: 'offline-123',
      },
    );

    expect(repo.save).toHaveBeenCalledWith(processedAnalysis);

    expect(http.axiosRef.post).toHaveBeenCalledWith(
      'http://fruit-backend:3000/api/v1/internal/notify',
      {
        event: 'analisis_listo',
        data: {
          imageId: 'img-1',
          id: 'analysis-123',
          userId: 'user-1',
        },
      },
      {
        timeout: 3000,
        headers: {
          'x-internal-token': 'x'.repeat(32),
        },
      },
    );
  });

  it('propaga el error cuando la inferencia falla y no intenta guardar', async () => {
    inference.analyze.mockRejectedValue(new Error('inference down'));

    await expect(service.process(dto)).rejects.toThrow('inference down');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el guardado falla', async () => {
    repo.save.mockRejectedValue(new Error('db down'));

    await expect(service.process(dto)).rejects.toThrow('db down');
  });

  it('resuelve aunque la notificación al backend falle (no-crítica)', async () => {
    http.axiosRef.post.mockRejectedValue(new Error('backend down'));

    await expect(service.process(dto)).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalled();
  });
});
