import { RmqContext } from '@nestjs/microservices';
import { FruitsController } from './fruits.controller';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

jest.mock('../config/envs', () => ({
  envs: {
    nuevaFrutaMaxAttempts: 3,
    nuevaFrutaBackoffBaseMs: 0,
  },
}));

const makeCtx = () => {
  const channel = { ack: jest.fn(), nack: jest.fn() };
  const message = {
    content: Buffer.from('{}'),
    properties: {
      headers: {
        'x-trace-id': 'test-trace-id',
      },
    },
  };
  const context = {
    getChannelRef: () => channel,
    getMessage: () => message,
  } as unknown as RmqContext;
  return { channel, message, context };
};

describe('FruitsController', () => {
  const dto = { image_id: 'img-1', storage_key: 'k1' } as NuevaFrutaDto;

  let service: {
    process: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
  };
  let controller: FruitsController;

  beforeEach(() => {
    service = { process: jest.fn(), findAll: jest.fn(), findById: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    controller = new FruitsController(service as any, logger as any);
  });

  describe('handleNuevaFruta', () => {
    it('hace ack al primer intento exitoso', async () => {
      service.process.mockResolvedValue(undefined);
      const { channel, message, context } = makeCtx();

      await controller.handleNuevaFruta(dto, context);

      expect(service.process).toHaveBeenCalledTimes(1);
      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('reintenta y hace ack si un intento posterior tiene éxito', async () => {
      service.process
        .mockRejectedValueOnce(new Error('intento 1'))
        .mockRejectedValueOnce(new Error('intento 2'))
        .mockResolvedValueOnce(undefined);
      const { channel, message, context } = makeCtx();

      await controller.handleNuevaFruta(dto, context);

      expect(service.process).toHaveBeenCalledTimes(3);
      expect(channel.ack).toHaveBeenCalledWith(message);
      expect(channel.nack).not.toHaveBeenCalled();
    });

    it('hace nack sin requeue tras agotar los intentos y no relanza', async () => {
      service.process.mockRejectedValue(new Error('siempre falla'));
      const { channel, message, context } = makeCtx();

      await expect(
        controller.handleNuevaFruta(dto, context),
      ).resolves.toBeUndefined();

      expect(service.process).toHaveBeenCalledTimes(3);
      expect(channel.nack).toHaveBeenCalledWith(message, false, false);
      expect(channel.ack).not.toHaveBeenCalled();
    });
  });

  describe('handlers request-reply', () => {
    it('get_fruits hace ack y devuelve el resultado', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0 });
      const { channel, message, context } = makeCtx();

      const result = await controller.getAll({}, context);

      expect(result).toEqual({ data: [], total: 0 });
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruits transforma las fechas y pasa correctamente los filtros', async () => {
      service.findAll.mockResolvedValue({ data: [], total: 0 });
      const { context } = makeCtx();

      await controller.getAll(
        {
          page: 2,
          limit: 10,
          imageId: 'img-1',
          userId: 'user-1',
          startDate: '2026-08-01T00:00:00.000Z',
          endDate: '2026-08-09T00:00:00.000Z',
          productorId: 'producer-1',
          campoIds: ['campo-1', 'campo-2'],
        },
        context,
      );

      expect(service.findAll).toHaveBeenCalledWith(
        2,
        10,
        'img-1',
        'user-1',
        new Date('2026-08-01T00:00:00.000Z'),
        new Date('2026-08-09T05:59:59.999Z'),
        {
          productorId: 'producer-1',
          campoIds: ['campo-1', 'campo-2'],
        },
      );
    });

    it('get_fruits hace ack aunque el service lance', async () => {
      service.findAll.mockRejectedValue(new Error('boom'));
      const { channel, message, context } = makeCtx();

      await expect(controller.getAll({}, context)).rejects.toThrow('boom');
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruit_by_id devuelve el análisis cuando existe', async () => {
      const analysis = {
        id: 'analysis-1',
        image_id: 'img-1',
        productor_id: 'producer-1',
        campo_id: 'campo-1',
      };

      service.findById.mockResolvedValue(analysis);
      const { channel, message, context } = makeCtx();

      const result = await controller.getById({ id: 'analysis-1' }, context);

      expect(result).toEqual(analysis);
      expect(service.findById).toHaveBeenCalledWith('analysis-1');
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruit_by_id devuelve null cuando el productor no coincide', async () => {
      const analysis = {
        id: 'analysis-1',
        image_id: 'img-1',
        productor_id: 'producer-1',
        campo_id: 'campo-1',
      };

      service.findById.mockResolvedValue(analysis);
      const { channel, message, context } = makeCtx();

      const result = await controller.getById(
        {
          id: 'analysis-1',
          productorId: 'producer-2',
        },
        context,
      );

      expect(result).toBeNull();
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruit_by_id devuelve null cuando el campo no está permitido', async () => {
      const analysis = {
        id: 'analysis-1',
        image_id: 'img-1',
        productor_id: 'producer-1',
        campo_id: 'campo-1',
      };

      service.findById.mockResolvedValue(analysis);
      const { channel, message, context } = makeCtx();

      const result = await controller.getById(
        {
          id: 'analysis-1',
          campoIds: ['campo-2', 'campo-3'],
        },
        context,
      );

      expect(result).toBeNull();
      expect(channel.ack).toHaveBeenCalledWith(message);
    });

    it('get_fruit_by_id hace ack y devuelve null si no existe', async () => {
      service.findById.mockRejectedValue(new Error('not found'));
      const { channel, message, context } = makeCtx();

      const result = await controller.getById({ id: 'x' }, context);

      expect(result).toBeNull();
      expect(channel.ack).toHaveBeenCalledWith(message);
    });
  });
});
