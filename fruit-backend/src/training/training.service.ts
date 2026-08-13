import { ConflictException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '@rubus/database';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { envs } from '../config/envs';
import type { TrainingStatusResponse } from './training.types';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
    private readonly httpService: HttpService,
  ) {}

  async getStatus(): Promise<TrainingStatusResponse> {
    await this.timeoutStaleRunningJob();

    const [activeModelRow, activeJob, historialJobs, historialVersiones] =
      await Promise.all([
        this.prisma.modelVersion.findFirst({ where: { status: 'PROMOVIDO' } }),
        this.prisma.trainingJob.findFirst({
          where: { status: { in: ['PENDING', 'RUNNING'] } },
        }),
        this.prisma.trainingJob.findMany({ orderBy: { iniciadoAt: 'desc' }, take: 20 }),
        this.prisma.modelVersion.findMany({ orderBy: { version: 'desc' }, take: 20 }),
      ]);

    // historialJobs ya viene ordenado desc por iniciadoAt sin filtro, así que
    // su primer elemento ES el último job — evita una query duplicada.
    const lastJob = historialJobs[0] ?? null;
    const countNuevos = await this.countNuevosAnalisisDesde(
      this.prisma,
      lastJob?.iniciadoAt ?? null,
    );

    return {
      activeModel: activeModelRow
        ? {
            version: activeModelRow.version,
            mAP: activeModelRow.mAP,
            promovidoAt: activeModelRow.promovidoAt,
          }
        : null,
      countNuevosAnalisisRevisados: countNuevos,
      umbralMinimo: envs.trainingMinReviewedAnalyses,
      activeJob: activeJob
        ? { id: activeJob.id, status: activeJob.status, iniciadoAt: activeJob.iniciadoAt }
        : null,
      historialJobs: historialJobs.map((j) => ({
        id: j.id,
        status: j.status,
        datasetSize: j.datasetSize,
        errorMessage: j.errorMessage,
        iniciadoAt: j.iniciadoAt,
        finalizadoAt: j.finalizadoAt,
      })),
      historialVersiones: historialVersiones.map((v) => ({
        id: v.id,
        version: v.version,
        mAP: v.mAP,
        mAPBase: v.mAPBase,
        status: v.status,
        trainingJobId: v.trainingJobId,
        createdAt: v.createdAt,
      })),
    };
  }

  async createJob(userId: string): Promise<{ jobId: string }> {
    await this.timeoutStaleRunningJob();

    const job = await this.prisma.$transaction(async (tx) => {
      const activeJob = await tx.trainingJob.findFirst({
        where: { status: { in: ['PENDING', 'RUNNING'] } },
      });
      if (activeJob) {
        throw new ConflictException('Ya hay un entrenamiento en curso.');
      }

      const lastJob = await tx.trainingJob.findFirst({ orderBy: { iniciadoAt: 'desc' } });
      const countNuevos = await this.countNuevosAnalisisDesde(tx, lastJob?.iniciadoAt ?? null);
      if (countNuevos < envs.trainingMinReviewedAnalyses) {
        throw new ConflictException(
          `Se requieren al menos ${envs.trainingMinReviewedAnalyses} análisis revisados nuevos desde el último job (hay ${countNuevos}).`,
        );
      }

      return tx.trainingJob.create({ data: { iniciadoPorId: userId } });
    });

    const activeModel = await this.prisma.modelVersion.findFirst({
      where: { status: 'PROMOVIDO' },
    });

    try {
      await firstValueFrom(
        this.httpService.post(
          `${envs.trainingUrl}/train`,
          { job_id: job.id, base_model_r2_key: activeModel?.r2Key ?? null },
          {
            headers: { 'x-training-token': envs.trainingInternalToken },
            timeout: 10_000,
          },
        ),
      );
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING' },
      });
    } catch (error) {
      await this.prisma.trainingJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          errorMessage: 'No se pudo contactar a fruit-training',
          finalizadoAt: new Date(),
        },
      });
      throw new ServiceUnavailableException(
        'No se pudo iniciar el entrenamiento: fruit-training no respondió.',
      );
    }

    return { jobId: job.id };
  }

  private async countNuevosAnalisisDesde(
    client: { analysis: { count: (args: unknown) => Promise<number> } },
    since: Date | null,
  ): Promise<number> {
    return client.analysis.count({
      where: {
        deteccionesRevisadas: true,
        ...(since ? { deteccionesRevisadasAt: { gt: since } } : {}),
      },
    });
  }

  private async timeoutStaleRunningJob(): Promise<void> {
    const threshold = new Date(
      Date.now() - envs.trainingJobTimeoutHours * 60 * 60 * 1000,
    );
    await this.prisma.trainingJob.updateMany({
      where: { status: 'RUNNING', iniciadoAt: { lt: threshold } },
      data: { status: 'FAILED', errorMessage: 'timeout', finalizadoAt: new Date() },
    });
  }
}
