import { TrainingService } from './training.service';
import { PrismaService } from '@rubus/database';
import { HttpService } from '@nestjs/axios';
import type { IStoragePort } from '../storage/ports';
import { of, throwError } from 'rxjs';

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

    it('marca como FAILED los jobs RUNNING o PENDING que llevan más del timeout', async () => {
      // PENDING también se reclama, no solo RUNNING: un job puede quedar
      // varado en PENDING si el proceso se cae entre el commit de
      // createJob() y su update a RUNNING/FAILED — sin esto, bloquearía
      // createJob() para siempre.
      await service.getStatus();

      expect(prisma.trainingJob.updateMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['PENDING', 'RUNNING'] },
          iniciadoAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'FAILED',
          errorMessage: 'timeout',
          finalizadoAt: expect.any(Date),
        },
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
        expect.objectContaining({
          id: 'job-anterior',
          status: 'COMPLETED',
          datasetSize: 80,
        }),
      ]);
      expect(status.historialVersiones).toEqual([
        expect.objectContaining({
          id: 'mv-1',
          version: 3,
          status: 'PROMOVIDO',
        }),
      ]);
      // countNuevosAnalisisDesde usa el iniciadoAt del job más reciente
      // (historialJobs[0], NO una query separada) como corte "since".
      expect(prisma.analysis.count).toHaveBeenCalledWith({
        where: {
          deteccionesRevisadas: true,
          deteccionesRevisadasAt: { gt: job1IniciadoAt },
        },
      });
    });

    it('no filtra por fecha en countNuevosAnalisisRevisados cuando no hay ningún job previo', async () => {
      await service.getStatus();

      expect(prisma.analysis.count).toHaveBeenCalledWith({
        where: { deteccionesRevisadas: true },
      });
    });
  });

  describe('createJob()', () => {
    beforeEach(() => {
      prisma.trainingJob.updateMany.mockResolvedValue({ count: 0 });
    });

    it('lanza 409 si ya hay un job PENDING o RUNNING', async () => {
      prisma.trainingJob.findFirst.mockResolvedValueOnce({
        id: 'job-activo',
        status: 'RUNNING',
      });

      await expect(service.createJob('user-1')).rejects.toThrow(
        'Ya hay un entrenamiento en curso',
      );
    });

    it('lanza 409 si no se alcanza el umbral de análisis revisados nuevos', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null) // no hay job activo
        .mockResolvedValueOnce(null); // no hay job previo
      prisma.analysis.count.mockResolvedValue(10);

      await expect(service.createJob('user-1')).rejects.toThrow(
        'análisis revisados nuevos',
      );
    });

    it('crea el job, llama a fruit-training y lo marca RUNNING', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.analysis.count.mockResolvedValue(50);
      prisma.trainingJob.create.mockResolvedValue({ id: 'job-nuevo' });
      prisma.modelVersion.findFirst.mockResolvedValue({
        r2Key: 'models/best_v2.pt',
      });
      httpService.post.mockReturnValue(of({ data: { status: 'accepted' } }));

      const result = await service.createJob('user-1');

      expect(result).toEqual({ jobId: 'job-nuevo' });
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/train'),
        { job_id: 'job-nuevo', base_model_r2_key: 'models/best_v2.pt' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-training-token': expect.any(String),
          }),
        }),
      );
      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-nuevo' },
        data: { status: 'RUNNING' },
      });
    });

    it('marca el job FAILED si fruit-training no responde', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.analysis.count.mockResolvedValue(50);
      prisma.trainingJob.create.mockResolvedValue({ id: 'job-nuevo' });
      prisma.modelVersion.findFirst.mockResolvedValue(null);
      httpService.post.mockReturnValue(
        throwError(() => new Error('connection refused')),
      );

      await expect(service.createJob('user-1')).rejects.toThrow();

      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-nuevo' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });

    it('marca el job FAILED (no lo deja en PENDING) si falla el lookup del modelo activo', async () => {
      prisma.trainingJob.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      prisma.analysis.count.mockResolvedValue(50);
      prisma.trainingJob.create.mockResolvedValue({ id: 'job-nuevo' });
      prisma.modelVersion.findFirst.mockRejectedValue(
        new Error('DB no disponible'),
      );

      await expect(service.createJob('user-1')).rejects.toThrow();

      expect(httpService.post).not.toHaveBeenCalled();
      expect(prisma.trainingJob.update).toHaveBeenCalledWith({
        where: { id: 'job-nuevo' },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });
  });
});
