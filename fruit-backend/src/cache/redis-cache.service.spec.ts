import { RedisCacheService } from './redis-cache.service';

type MockRedis = {
  get: jest.Mock;
  set: jest.Mock;
  scan: jest.Mock;
  del: jest.Mock;
  on: jest.Mock;
  quit: jest.Mock;
};

const makeRedis = (): MockRedis => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
  scan: jest.fn(),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue('OK'),
});

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('RedisCacheService', () => {
  let redis: MockRedis;
  let service: RedisCacheService;

  beforeEach(() => {
    redis = makeRedis();
    service = new RedisCacheService(redis as never, logger as never);
  });

  describe('getOrSet()', () => {
    it('HIT: devuelve el valor cacheado sin ejecutar compute', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ total: 5 }));
      const compute = jest.fn();

      const result = await service.getOrSet('dash:health:global', 300, compute);

      expect(result).toEqual({ total: 5 });
      expect(compute).not.toHaveBeenCalled();
      expect(redis.get).toHaveBeenCalledWith('dash:health:global');
    });

    it('MISS: ejecuta compute y guarda el JSON con TTL', async () => {
      redis.get.mockResolvedValue(null);
      const compute = jest.fn().mockResolvedValue([1, 2, 3]);

      const result = await service.getOrSet('dash:yield:global', 300, compute);

      expect(result).toEqual([1, 2, 3]);
      expect(compute).toHaveBeenCalledTimes(1);
      expect(redis.set).toHaveBeenCalledWith(
        'dash:yield:global',
        JSON.stringify([1, 2, 3]),
        'EX',
        300,
      );
    });

    it('error de Redis en GET: cae a compute sin lanzar y no intenta SET', async () => {
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
      const compute = jest.fn().mockResolvedValue('fallback');

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe(
        'fallback',
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('JSON corrupto en cache: cae a compute sin lanzar', async () => {
      redis.get.mockResolvedValue('{no-es-json');
      const compute = jest.fn().mockResolvedValue('fresco');

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe('fresco');
    });

    it('error de Redis en SET: devuelve el valor computado igualmente', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockRejectedValue(new Error('ECONNREFUSED'));
      const compute = jest.fn().mockResolvedValue(42);

      await expect(service.getOrSet('k', 300, compute)).resolves.toBe(42);
    });
  });

  describe('invalidatePrefix()', () => {
    it('recorre SCAN hasta cursor 0 y borra todas las claves encontradas', async () => {
      redis.scan
        .mockResolvedValueOnce([
          '5',
          ['dash:yield:global', 'dash:health:global'],
        ])
        .mockResolvedValueOnce(['0', ['dash:phenology:abc']]);

      await service.invalidatePrefix('dash:');

      expect(redis.scan).toHaveBeenNthCalledWith(
        1,
        '0',
        'MATCH',
        'dash:*',
        'COUNT',
        100,
      );
      expect(redis.scan).toHaveBeenNthCalledWith(
        2,
        '5',
        'MATCH',
        'dash:*',
        'COUNT',
        100,
      );
      expect(redis.del).toHaveBeenCalledWith(
        'dash:yield:global',
        'dash:health:global',
      );
      expect(redis.del).toHaveBeenCalledWith('dash:phenology:abc');
    });

    it('no llama a DEL cuando SCAN no devuelve claves', async () => {
      redis.scan.mockResolvedValueOnce(['0', []]);

      await service.invalidatePrefix('dash:');

      expect(redis.del).not.toHaveBeenCalled();
    });

    it('error de Redis: no lanza', async () => {
      redis.scan.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(service.invalidatePrefix('dash:')).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy()', () => {
    it('cierra la conexión con quit()', async () => {
      await service.onModuleDestroy();
      expect(redis.quit).toHaveBeenCalled();
    });
  });
});
