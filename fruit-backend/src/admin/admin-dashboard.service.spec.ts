import { AdminDashboardService } from './admin-dashboard.service';
import { PrismaService } from '@rubus/database';
import { RedisCacheService } from '../cache/redis-cache.service';

describe('AdminDashboardService', () => {
  let prisma: { $queryRaw: jest.Mock; analysis: { aggregate: jest.Mock } };
  let cache: { getOrSet: jest.Mock };
  let service: AdminDashboardService;

  beforeEach(() => {
    prisma = { $queryRaw: jest.fn(), analysis: { aggregate: jest.fn() } };
    // Passthrough: ejecuta compute() para poder verificar la lógica interna,
    // y a la vez permite asertar clave y TTL.
    cache = {
      getOrSet: jest.fn(
        (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
      ),
    };
    service = new AdminDashboardService(
      prisma as unknown as PrismaService,
      cache as unknown as RedisCacheService,
    );
  });

  describe('getYieldForecast()', () => {
    it('usa la clave global con TTL 300 cuando no hay productorId', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      await service.getYieldForecast();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:yield:global',
        300,
        expect.any(Function),
      );
    });

    it('usa la clave del productor y convierte los agregados a number', async () => {
      prisma.$queryRaw.mockResolvedValue([
        { daysToHarvest: 3n, estimatedWeightGrams: '1500' },
      ]);

      const result = await service.getYieldForecast('prod-1');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:yield:prod-1',
        300,
        expect.any(Function),
      );
      expect(result).toEqual([
        { daysToHarvest: 3, estimatedWeightGrams: 1500 },
      ]);
    });
  });

  describe('getHealthMetrics()', () => {
    it('usa la clave correcta y mapea el aggregate con defaults en 0', async () => {
      prisma.analysis.aggregate.mockResolvedValue({
        _avg: { porcentajeMermaGeneral: null },
        _sum: {
          elementosEnfermos: null,
          elementosSanos: 10,
          totalElementosDetectados: 12,
        },
      });

      const result = await service.getHealthMetrics('prod-1');

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:health:prod-1',
        300,
        expect.any(Function),
      );
      expect(result).toEqual({
        avgLossPercent: 0,
        totalSickCount: 0,
        totalHealthyCount: 10,
        totalDetected: 12,
      });
    });
  });

  describe('getPhenologyDistribution()', () => {
    it('usa la clave global y convierte count a number', async () => {
      prisma.$queryRaw.mockResolvedValue([{ stage: 'maduro', count: 7n }]);

      const result = await service.getPhenologyDistribution();

      expect(cache.getOrSet).toHaveBeenCalledWith(
        'dash:phenology:global',
        300,
        expect.any(Function),
      );
      expect(result).toEqual([{ stage: 'maduro', count: 7 }]);
    });
  });

  it('en cache HIT no toca Prisma', async () => {
    cache.getOrSet.mockResolvedValue([{ stage: 'maduro', count: 1 }]);

    await service.getPhenologyDistribution();

    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.analysis.aggregate).not.toHaveBeenCalled();
  });
});
