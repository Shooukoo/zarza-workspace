import { TrainingService } from './training.service';
import { PrismaService } from '@rubus/database';
import { HttpService } from '@nestjs/axios';
import type { IStoragePort } from '../storage/ports';

describe('TrainingService', () => {
  let prisma: any;
  let storage: { downloadBuffer: jest.Mock; getPresignedUrl: jest.Mock };
  let httpService: { post: jest.Mock };
  let service: TrainingService;

  beforeEach(() => {
    prisma = {
      trainingJob: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      modelVersion: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      analysis: { count: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb: any) => cb(prisma)),
    };
    storage = { downloadBuffer: jest.fn(), getPresignedUrl: jest.fn() };
    httpService = { post: jest.fn() };
    service = new TrainingService(
      prisma as unknown as PrismaService,
      storage as unknown as IStoragePort,
      httpService as unknown as HttpService,
    );
  });

  describe('getStatus()', () => {
    beforeEach(() => {
      prisma.trainingJob.updateMany.mockResolvedValue({ count: 0 });
      prisma.modelVersion.findFirst.mockResolvedValue(null);
      prisma.trainingJob.findFirst.mockResolvedValue(null);
      prisma.trainingJob.findMany.mockResolvedValue([]);
      prisma.modelVersion.findMany.mockResolvedValue([]);
      prisma.analysis.count.mockResolvedValue(3);
    });

    it('retorna activeModel=null cuando no hay ningún ModelVersion PROMOVIDO', async () => {
      const status = await service.getStatus();

      expect(status.activeModel).toBeNull();
      expect(status.countNuevosAnalisisRevisados).toBe(3);
      expect(status.umbralMinimo).toBe(50);
    });

    it('marca como FAILED los jobs RUNNING que llevan más del timeout', async () => {
      await service.getStatus();

      expect(prisma.trainingJob.updateMany).toHaveBeenCalledWith({
        where: { status: 'RUNNING', iniciadoAt: { lt: expect.any(Date) } },
        data: { status: 'FAILED', errorMessage: 'timeout', finalizadoAt: expect.any(Date) },
      });
    });

    it('mapea activeModel/activeJob/historial cuando hay datos reales', async () => {
      const promovidoAt = new Date('2026-08-01T00:00:00Z');
      prisma.modelVersion.findFirst.mockResolvedValue({
        id: 'mv-1',
        version: 3,
        mAP: 0.8,
        promovidoAt,
      });
      const job1IniciadoAt = new Date('2026-08-10T00:00:00Z');
      const job2IniciadoAt = new Date('2026-08-05T00:00:00Z');
      prisma.trainingJob.findFirst.mockResolvedValue({
        id: 'job-activo',
        status: 'RUNNING',
        iniciadoAt: job1IniciadoAt,
      });
      prisma.trainingJob.findMany.mockResolvedValue([
        {
          id: 'job-activo',
          status: 'RUNNING',
          datasetSize: null,
          errorMessage: null,
          iniciadoAt: job1IniciadoAt,
          finalizadoAt: null,
        },
        {
          id: 'job-anterior',
          status: 'COMPLETED',
          datasetSize: 80,
          errorMessage: null,
          iniciadoAt: job2IniciadoAt,
          finalizadoAt: new Date('2026-08-05T02:00:00Z'),
        },
      ]);
      prisma.modelVersion.findMany.mockResolvedValue([
        {
          id: 'mv-1',
          version: 3,
          mAP: 0.8,
          mAPBase: 0.6,
          status: 'PROMOVIDO',
          trainingJobId: 'job-anterior',
          createdAt: job2IniciadoAt,
        },
      ]);

      const status = await service.getStatus();

      expect(status.activeModel).toEqual({ version: 3, mAP: 0.8, promovidoAt });
      expect(status.activeJob).toEqual({
        id: 'job-activo',
        status: 'RUNNING',
        iniciadoAt: job1IniciadoAt,
      });
      expect(status.historialJobs).toEqual([
        expect.objectContaining({ id: 'job-activo', status: 'RUNNING' }),
        expect.objectContaining({ id: 'job-anterior', status: 'COMPLETED', datasetSize: 80 }),
      ]);
      expect(status.historialVersiones).toEqual([
        expect.objectContaining({ id: 'mv-1', version: 3, status: 'PROMOVIDO' }),
      ]);
      // countNuevosAnalisisDesde usa el iniciadoAt del job más reciente
      // (historialJobs[0], NO una query separada) como corte "since".
      expect(prisma.analysis.count).toHaveBeenCalledWith({
        where: { deteccionesRevisadas: true, deteccionesRevisadasAt: { gt: job1IniciadoAt } },
      });
    });

    it('no filtra por fecha en countNuevosAnalisisRevisados cuando no hay ningún job previo', async () => {
      await service.getStatus();

      expect(prisma.analysis.count).toHaveBeenCalledWith({
        where: { deteccionesRevisadas: true },
      });
    });
  });
});
