import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getYieldForecast(productorId?: string) {
    type Row = { daysToHarvest: number; estimatedWeightGrams: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  (fe.etapa = 'maduro' OR fe.cambia_a = 'maduro')
            AND  a.productor_id = ${productorId}::uuid
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`
      : await this.prisma.$queryRaw`
          SELECT fe.dias_para_cosecha     AS "daysToHarvest",
                 COALESCE(SUM(a.peso_sano_gramos), 0) AS "estimatedWeightGrams"
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  fe.etapa = 'maduro' OR fe.cambia_a = 'maduro'
          GROUP BY fe.dias_para_cosecha
          ORDER BY fe.dias_para_cosecha ASC`;
    return rows.map((r) => ({
      daysToHarvest: Number(r.daysToHarvest),
      estimatedWeightGrams: Number(r.estimatedWeightGrams),
    }));
  }

  async getHealthMetrics(productorId?: string) {
    const result = await this.prisma.analysis.aggregate({
      where: productorId ? { productorId } : undefined,
      _avg: { porcentajeMermaGeneral: true },
      _sum: {
        elementosEnfermos: true,
        elementosSanos: true,
        totalElementosDetectados: true,
      },
    });
    return {
      avgLossPercent: result._avg.porcentajeMermaGeneral ?? 0,
      totalSickCount: result._sum.elementosEnfermos ?? 0,
      totalHealthyCount: result._sum.elementosSanos ?? 0,
      totalDetected: result._sum.totalElementosDetectados ?? 0,
    };
  }

  async getPhenologyDistribution(productorId?: string) {
    type Row = { stage: string; count: number };
    const rows: Row[] = productorId
      ? await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          JOIN   analyses a ON a.id = fe.analysis_id
          WHERE  a.productor_id = ${productorId}::uuid
          GROUP BY fe.etapa
          ORDER BY count DESC`
      : await this.prisma.$queryRaw`
          SELECT fe.etapa AS stage, COALESCE(SUM(fe.cantidad), 0) AS count
          FROM   fenologia_etapas fe
          GROUP BY fe.etapa
          ORDER BY count DESC`;
    return rows.map((r) => ({ stage: r.stage, count: Number(r.count) }));
  }
}
