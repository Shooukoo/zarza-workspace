import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalysisDashboardDocument } from './schemas/analysis.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(AnalysisDashboardDocument.name)
    private readonly analysisModel: Model<AnalysisDashboardDocument>,
  ) {}

  async getYieldForecast(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push(
      { $unwind: '$cronograma_fenologico' },
      {
        $match: {
          $or: [
            { 'cronograma_fenologico.etapa': 'maduro' },
            { 'cronograma_fenologico.prediccion.cambio_a': 'maduro' },
          ],
        },
      },
      {
        $group: {
          _id: '$cronograma_fenologico.prediccion.dias_para_cosecha',
          totalGrams: { $sum: '$proyeccion_financiera.peso_sano_gramos' },
        },
      },
      { $sort: { _id: 1 } },
    );

    const result = await this.analysisModel.aggregate(pipeline).exec();
    return result.map((item) => ({
      daysToHarvest: item._id || 0,
      estimatedWeightGrams: item.totalGrams,
    }));
  }

  async getHealthMetrics(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push({
      $group: {
        _id: null,
        avgLossPercent: { $avg: '$metricas_salud.porcentaje_merma_general' },
        totalSickCount: { $sum: '$metricas_salud.elementos_enfermos' },
        totalHealthyCount: { $sum: '$metricas_salud.elementos_sanos' },
        totalDetected: { $sum: '$metricas_salud.total_elementos_detectados' },
      },
    });

    const result = await this.analysisModel.aggregate(pipeline).exec();
    if (!result.length) {
      return { avgLossPercent: 0, totalSickCount: 0, totalHealthyCount: 0, totalDetected: 0 };
    }
    const doc = result[0];
    return {
      avgLossPercent: doc.avgLossPercent,
      totalSickCount: doc.totalSickCount,
      totalHealthyCount: doc.totalHealthyCount,
      totalDetected: doc.totalDetected,
    };
  }

  async getPhenologyDistribution(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push(
      { $unwind: '$cronograma_fenologico' },
      {
        $group: {
          _id: '$cronograma_fenologico.etapa',
          count: { $sum: '$cronograma_fenologico.cantidad' },
        },
      },
      { $sort: { count: -1 } },
    );

    const result = await this.analysisModel.aggregate(pipeline).exec();
    return result.map((item) => ({ stage: item._id, count: item.count }));
  }
}
