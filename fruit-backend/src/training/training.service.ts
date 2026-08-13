import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
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

    const [activeModelRow, lastJob, activeJob, historialJobs, historialVersiones] =
      await Promise.all([
        this.prisma.modelVersion.findFirst({ where: { status: 'PROMOVIDO' } }),
        this.prisma.trainingJob.findFirst({ orderBy: { iniciadoAt: 'desc' } }),
        this.prisma.trainingJob.findFirst({
          where: { status: { in: ['PENDING', 'RUNNING'] } },
        }),
        this.prisma.trainingJob.findMany({ orderBy: { iniciadoAt: 'desc' }, take: 20 }),
        this.prisma.modelVersion.findMany({ orderBy: { version: 'desc' }, take: 20 }),
      ]);

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
