import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Analysis, AnalysisDocument } from './analyses.schema';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { STORAGE_PORT, type IStoragePort } from '../storage/ports';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';

@Injectable()
export class AnalysesService {
  private readonly logger = new Logger(AnalysesService.name);

  constructor(
    @InjectModel(Analysis.name)
    private readonly analysisModel: Model<AnalysisDocument>,
    @Inject(STORAGE_PORT)
    private readonly storage: IStoragePort,
  ) {}

  async findAll(
    page: number,
    limit: number,
    estado: 'pendiente' | 'validado' | 'rechazado' | 'all',
    scope: UserScope,
  ): Promise<{ data: AnalysisDocument[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query: Record<string, unknown> = {};

    if (estado === 'pendiente') {
      query['validacion_experto.estado'] = { $in: ['pendiente', null] };
    } else if (estado === 'validado') {
      query['validacion_experto.estado'] = 'validado';
    } else if (estado === 'rechazado') {
      query['validacion_experto.estado'] = 'rechazado';
    }

    if (scope.role === Role.PRODUCTOR) {
      query.productor_id = new Types.ObjectId(scope.sub);
    }
    if (scope.role === Role.AGRONOMO && scope.camposAsignados?.length) {
      query.campo_id = {
        $in: scope.camposAsignados
          .filter((id) => Types.ObjectId.isValid(id))
          .map((id) => new Types.ObjectId(id)),
      };
    }

    const [data, total] = await Promise.all([
      this.analysisModel
        .find(query)
        .sort({ fecha_analisis: -1 })
        .skip(skip)
        .limit(limit)
        .lean<AnalysisDocument[]>()
        .exec(),
      this.analysisModel.countDocuments(query),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AnalysisDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    }
    const analysis = await this.analysisModel
      .findById(id)
      .lean<AnalysisDocument>()
      .exec();

    if (!analysis) {
      throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    }
    return analysis;
  }

  async getImageUrl(id: string): Promise<string> {
    const analysis = await this.findById(id);
    if (!analysis.storage_key) {
      throw new NotFoundException(`El análisis ${id} no tiene imagen asociada`);
    }
    return this.storage.getPresignedUrl(analysis.storage_key, 900);
  }

  async validate(
    id: string,
    corregidoPorId: string,
    dto: ValidateAnalysisDto,
  ): Promise<AnalysisDocument> {
    const existing = await this.findById(id);

    const setFields: Record<string, unknown> = {
      'validacion_experto.estado': dto.action,
      'validacion_experto.corregido_por': new Types.ObjectId(corregidoPorId),
      'validacion_experto.fecha_validacion': new Date(),
    };

    if (dto.action === 'rechazado' && dto.cronograma_corregido?.length) {
      const diagnosticoOriginal =
        existing.validacion_experto?.fue_corregido
          ? existing.validacion_experto.diagnostico_original
          : JSON.stringify(existing.cronograma_fenologico);

      setFields['validacion_experto.fue_corregido'] = true;
      setFields['validacion_experto.fecha_correccion'] = new Date();
      setFields['validacion_experto.diagnostico_original'] = diagnosticoOriginal;
      setFields['validacion_experto.cronograma_corregido'] = dto.cronograma_corregido;
      setFields['validacion_experto.observaciones'] = dto.observaciones ?? '';
    }

    const updated = await this.analysisModel
      .findByIdAndUpdate(id, { $set: setFields }, { new: true })
      .lean<AnalysisDocument>()
      .exec();

    if (!updated) throw new NotFoundException(`Análisis con id "${id}" no encontrado`);
    this.logger.log(`Análisis ${id} ${dto.action} por usuario ${corregidoPorId}`);
    return updated;
  }
}
