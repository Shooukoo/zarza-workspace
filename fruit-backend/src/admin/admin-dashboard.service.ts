import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalysisDashboardDocument } from './schemas/analysis.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(AnalysisDashboardDocument.name)
    private readonly analysisModel: Model<AnalysisDashboardDocument>,
  ) {}

  /**
   * Proyección de Cosecha (Yield Forecast)
   * Extrae los gramos sanos proyectados y los días para cosecha del estado maduro o próximo a madurar.
   */
  async getYieldForecast() {
    // Pipeline para extraer 'dias_para_cosecha' y sumarizar el peso
    const result = await this.analysisModel.aggregate([
      // Descomponemos el array fenológico
      { $unwind: '$cronograma_fenologico' },
      // Filtramos etapas que tienen una proyección a maduro o ya lo están
      {
        $match: {
          $or: [
            { 'cronograma_fenologico.etapa': 'maduro' },
            { 'cronograma_fenologico.prediccion.cambio_a': 'maduro' },
          ],
        },
      },
      // Agrupamos por días para cosecha
      {
        $group: {
          _id: '$cronograma_fenologico.prediccion.dias_para_cosecha',
          // Se asume proporción de gramos por etapa (simplificación analítica para dashboard)
          totalGrams: { $sum: '$proyeccion_financiera.peso_sano_gramos' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((item) => ({
      daysToHarvest: item._id || 0,
      estimatedWeightGrams: item.totalGrams,
    }));
  }

  /**
   * Resumen de salud y mermas
   */
  async getHealthMetrics() {
    const result = await this.analysisModel.aggregate([
      {
        $group: {
          _id: null,
          avgLossPercent: { $avg: '$metricas_salud.porcentaje_merma_general' },
          totalSickCount: { $sum: '$metricas_salud.elementos_enfermos' },
          totalHealthyCount: { $sum: '$metricas_salud.elementos_sanos' },
          totalDetected: { $sum: '$metricas_salud.total_elementos_detectados' },
        },
      },
    ]);

    if (!result.length) {
      return {
        avgLossPercent: 0,
        totalSickCount: 0,
        totalHealthyCount: 0,
        totalDetected: 0,
      };
    }

    const doc = result[0];
    return {
      avgLossPercent: doc.avgLossPercent,
      totalSickCount: doc.totalSickCount,
      totalHealthyCount: doc.totalHealthyCount,
      totalDetected: doc.totalDetected,
    };
  }

  /**
   * Distribución del cronograma fenológico
   */
  async getPhenologyDistribution() {
    const result = await this.analysisModel.aggregate([
      { $unwind: '$cronograma_fenologico' },
      {
        $group: {
          _id: '$cronograma_fenologico.etapa',
          count: { $sum: '$cronograma_fenologico.cantidad' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return result.map((item) => ({
      stage: item._id,
      count: item.count,
    }));
  }
}
