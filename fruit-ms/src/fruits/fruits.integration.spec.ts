import { Test, TestingModule } from '@nestjs/testing';
import { FruitsController } from './fruits.controller';
import { FruitsService } from './fruits.service';
import { ANALYSIS_REPOSITORY } from './ports';
import { I_INFERENCE_PORT } from './ports/inference.port';
import { AppLogger } from '../common/logging/app.logger';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { HttpService } from '@nestjs/axios';

jest.mock('../config/envs', () => ({
  envs: {
    backendUrl: 'http://fruit-backend:3000',
    internalNotifyToken: 'x'.repeat(32),
    nuevaFrutaMaxAttempts: 1,
    nuevaFrutaBackoffBaseMs: 1,
  },
}));

describe('FruitsController - flujo nueva_fruta', () => {
  let controller: FruitsController;

  let inference: {
    analyze: jest.Mock;
  };

  let repository: {
    save: jest.Mock;
  };

  let http: {
    axiosRef: {
      post: jest.Mock;
    };
  };

  let channel: {
    ack: jest.Mock;
    nack: jest.Mock;
  };

  let context: {
    getMessage: jest.Mock;
    getChannelRef: jest.Mock;
  };

  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    inference = {
      analyze: jest.fn(),
    };

    repository = {
      save: jest.fn(),
    };

    http = {
      axiosRef: {
        post: jest.fn(),
      },
    };

    channel = {
      ack: jest.fn(),
      nack: jest.fn(),
    };

    const message = {
      properties: {
        headers: {
          'x-trace-id': 'trace-test-123',
        },
      },
    };

    context = {
      getMessage: jest.fn().mockReturnValue(message),
      getChannelRef: jest.fn().mockReturnValue(channel),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FruitsController],
      providers: [
        FruitsService,
        {
          provide: I_INFERENCE_PORT,
          useValue: inference,
        },
        {
          provide: ANALYSIS_REPOSITORY,
          useValue: repository,
        },
        {
          provide: AppLogger,
          useValue: logger,
        },
        {
          provide: HttpService,
          useValue: http,
        },
      ],
    }).compile();

    controller = module.get<FruitsController>(FruitsController);
  });

  it('procesa nueva_fruta de extremo a extremo y hace ack', async () => {
    const dto = {
      image_id: 'img-1',
      storage_key: 'k1',
      userId: 'user-1',
      userEmail: 'user@example.com',
      campoId: 'campo-1',
      productorId: 'producer-1',
      gpsLat: 19.456,
      gpsLon: -102.123,
      offlineSyncId: 'offline-123',
    } as NuevaFrutaDto;

    const analysis = {
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

    inference.analyze.mockResolvedValue(analysis);
    repository.save.mockResolvedValue('analysis-123');
    http.axiosRef.post.mockResolvedValue({});

    await controller.handleNuevaFruta(dto, context as any);

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

    expect(repository.save).toHaveBeenCalledWith(analysis);

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
          'x-trace-id': 'trace-test-123',
        },
      },
    );

    expect(channel.ack).toHaveBeenCalledTimes(1);
    expect(channel.nack).not.toHaveBeenCalled();
  });
});
