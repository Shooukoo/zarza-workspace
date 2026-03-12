import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Analysis, AnalysisDocument } from '../schemas/analysis.schema';
import { ANALYSIS_REPOSITORY } from '../ports';
import type {
  IAnalysisRepository,
  FindAllFilter,
  PaginatedResult,
} from '../ports';


import { AnalysisDomain } from '../domain/analysis.entity';

/**
 * Adaptador de infraestructura: implementación concreta de IAnalysisRepository
 * usando Mongoose. Toda la interacción con MongoDB vive aquí y SÓLO aquí.
 * La capa de aplicación (FruitsService) no conoce esta clase directamente.
 */
@Injectable()
export class MongoAnalysisRepository implements IAnalysisRepository {
  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
  ) {}

  async save(analysis: AnalysisDomain): Promise<string> {
    const doc = await this.analysisModel.create({
      image_id:              analysis.image_id,
      storage_key:           analysis.storage_key,
      variedad:              analysis.variedad,
      fecha_analisis:        analysis.fecha_analisis,
      metricas_salud:        analysis.metricas_salud,
      proyeccion_financiera: analysis.proyeccion_financiera,
      cronograma_fenologico: analysis.cronograma_fenologico,
    });
    return (doc._id as Types.ObjectId).toString();
  }

  async findAll(
    page: number,
    limit: number,
    filter: FindAllFilter,
  ): Promise<PaginatedResult<AnalysisDomain>> {
    const skip = (page - 1) * limit;
    const query = filter.imageId ? { image_id: filter.imageId } : {};

    const [docs, total] = await Promise.all([
      this.analysisModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<AnalysisDocument[]>()
        .exec(),
      this.analysisModel.countDocuments(query),
    ]);

    const data: AnalysisDomain[] = docs.map((doc) => ({
      id:                    (doc._id as Types.ObjectId).toString(),
      image_id:              doc.image_id,
      storage_key:           doc.storage_key,
      variedad:              doc.variedad ?? null,
      fecha_analisis:        doc.fecha_analisis,
      metricas_salud:        doc.metricas_salud,
      proyeccion_financiera: doc.proyeccion_financiera,
      cronograma_fenologico: doc.cronograma_fenologico ?? [],
    }));

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AnalysisDomain | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const doc = await this.analysisModel
      .findById(id)
      .lean<AnalysisDocument>()
      .exec();
    if (!doc) return null;

    return {
      id:                    (doc._id as Types.ObjectId).toString(),
      image_id:              doc.image_id,
      storage_key:           doc.storage_key,
      variedad:              doc.variedad ?? null,
      fecha_analisis:        doc.fecha_analisis,
      metricas_salud:        doc.metricas_salud,
      proyeccion_financiera: doc.proyeccion_financiera,
      cronograma_fenologico: doc.cronograma_fenologico ?? [],
    };
  }
}
