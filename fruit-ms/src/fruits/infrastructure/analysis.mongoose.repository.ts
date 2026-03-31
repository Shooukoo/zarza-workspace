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
 */
@Injectable()
export class MongoAnalysisRepository implements IAnalysisRepository {
  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
  ) {}

  async save(analysis: AnalysisDomain): Promise<string> {
    const payload: any = {
      image_id:              analysis.image_id,
      storage_key:           analysis.storage_key,
      requester:             analysis.requester,
      variedad:              analysis.variedad,
      fecha_analisis:        analysis.fecha_analisis,
      metricas_salud:        analysis.metricas_salud,
      proyeccion_financiera: analysis.proyeccion_financiera,
      cronograma_fenologico: analysis.cronograma_fenologico,
    };

    // V2 fields (optional, may be null for backward-compat)
    if (analysis.campo_id) {
      payload.campo_id = new Types.ObjectId(analysis.campo_id);
    }
    if (analysis.productor_id) {
      payload.productor_id = new Types.ObjectId(analysis.productor_id);
    }
    if (analysis.ubicacion_gps) {
      payload.ubicacion_gps = analysis.ubicacion_gps;
    }
    if (analysis.offline_sync_id) {
      payload.offline_sync_id = analysis.offline_sync_id;
    }
    if (analysis.validacion_experto != null) {
      payload.validacion_experto = {
        fue_corregido:        analysis.validacion_experto.fue_corregido,
        corregido_por:        analysis.validacion_experto.corregido_por
          ? new Types.ObjectId(analysis.validacion_experto.corregido_por)
          : null,
        diagnostico_original: analysis.validacion_experto.diagnostico_original,
      };
    }

    const doc = await this.analysisModel.create(payload);
    return (doc._id as Types.ObjectId).toString();
  }

  async findAll(
    page: number,
    limit: number,
    filter: FindAllFilter,
  ): Promise<PaginatedResult<AnalysisDomain>> {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (filter.imageId) query.image_id = filter.imageId;
    if (filter.userId) query['requester.userId'] = filter.userId;
    
    if (filter.startDate || filter.endDate) {
      query.fecha_analisis = {};
      if (filter.startDate) query.fecha_analisis.$gte = filter.startDate;
      if (filter.endDate) query.fecha_analisis.$lte = filter.endDate;
    }

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

    const data: AnalysisDomain[] = docs.map((doc) => this.docToDomain(doc));
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AnalysisDomain | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const doc = await this.analysisModel
      .findById(id)
      .lean<AnalysisDocument>()
      .exec();
    if (!doc) return null;

    return this.docToDomain(doc);
  }

  private docToDomain(doc: AnalysisDocument): AnalysisDomain {
    return {
      id:                    (doc._id as Types.ObjectId).toString(),
      image_id:              doc.image_id,
      storage_key:           doc.storage_key,
      requester:             doc.requester,
      variedad:              doc.variedad ?? null,
      fecha_analisis:        doc.fecha_analisis,
      metricas_salud:        doc.metricas_salud,
      proyeccion_financiera: doc.proyeccion_financiera,
      cronograma_fenologico: doc.cronograma_fenologico ?? [],
      // V2 fields
      campo_id:      doc.campo_id ? doc.campo_id.toString() : null,
      productor_id:  doc.productor_id ? doc.productor_id.toString() : null,
      ubicacion_gps: doc.ubicacion_gps ?? null,
      offline_sync_id: doc.offline_sync_id ?? null,
      validacion_experto: doc.validacion_experto
        ? {
            fue_corregido:        doc.validacion_experto.fue_corregido,
            corregido_por:        doc.validacion_experto.corregido_por?.toString() ?? null,
            diagnostico_original: doc.validacion_experto.diagnostico_original ?? null,
          }
        : null,
    };
  }
}

