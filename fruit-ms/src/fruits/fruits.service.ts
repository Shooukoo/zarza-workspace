import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { ANALYSIS_REPOSITORY, I_INFERENCE_PORT } from './ports';
import type { IAnalysisRepository } from './ports';
import type { IInferencePort } from './ports/inference.port';

@Injectable()
export class FruitsService {
  private readonly logger = new Logger(FruitsService.name);

  constructor(
    @Inject(I_INFERENCE_PORT)
    private readonly inference: IInferencePort,
    @Inject(ANALYSIS_REPOSITORY)
    private readonly analysisRepo: IAnalysisRepository,
  ) {}

  async process(data: NuevaFrutaDto): Promise<void> {
    this.logger.log(
      `Nueva fruta recibida | id=${data.image_id} | key=${data.storage_key} | user=${data.userId ?? 'anon'}`,
    );

    // V2 context: pass metadata from ingestion event to the inference adapter
    const context = {
      campoId:       data.campoId,
      productorId:   data.productorId,
      gpsLat:        data.gpsLat,
      gpsLon:        data.gpsLon,
      offlineSyncId: data.offlineSyncId,
    };

    // 1. Llamar al servicio de inferencia a través del Port (Clean Architecture)
    let analysis;
    try {
      analysis = await this.inference.analyze(
        data.image_id,
        data.storage_key,
        { userId: data.userId ?? 'anonymous', email: data.userEmail ?? '' },
        context,
      );
    } catch (err) {
      this.logger.error(
        `Error al procesar inferencia: ${(err as Error).message}`,
      );
      return;
    }

    // 2. Loguear resumen usando la entidad de dominio
    const m = analysis.metricas_salud;
    this.logger.log(
      `Análisis completado | total=${m.total_elementos_detectados} | sanos=${m.elementos_sanos} | merma=${m.porcentaje_merma_general}%`,
    );
    this.logger.log(
      `Peso sano estimado: ${analysis.proyeccion_financiera.peso_sano_gramos} g`,
    );

    for (const etapa of analysis.cronograma_fenologico) {
      this.logger.log(
        `  [${etapa.etapa}] ${etapa.cantidad} elemento(s) → cosecha en ${etapa.prediccion.dias_para_cosecha} días`,
      );
    }

    // 3. Persistir usando el repositorio (no sabe nada de Mongoose)
    try {
      const savedId = await this.analysisRepo.save(analysis);
      this.logger.log(`[MongoDB] Análisis guardado | _id=${savedId} | campo=${analysis.campo_id ?? 'N/A'}`);
    } catch (err) {
      this.logger.error(
        `[MongoDB] Error al guardar el análisis: ${(err as Error).message}`,
      );
    }
  }

  /** Retorna análisis paginados ordenados del más reciente al más antiguo */
  async findAll(
    page: number,
    limit: number,
    imageId?: string,
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ) {
    return this.analysisRepo.findAll(page, limit, { imageId, userId, startDate, endDate });
  }

  /** Retorna un análisis por su MongoDB _id */
  async findById(id: string) {
    const result = await this.analysisRepo.findById(id);
    if (!result) throw new NotFoundException(`Análisis ${id} no encontrado`);
    return result;
  }
}


