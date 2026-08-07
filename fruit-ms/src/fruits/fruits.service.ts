import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { ANALYSIS_REPOSITORY, I_INFERENCE_PORT } from './ports';
import type { IAnalysisRepository } from './ports';
import type { IInferencePort } from './ports/inference.port';
import { envs } from '../config/envs';
import { AppLogger } from '../common/logging/app.logger';
import { traceContext } from '../common/logging/trace-context';

@Injectable()
export class FruitsService {
  constructor(
    @Inject(I_INFERENCE_PORT)
    private readonly inference: IInferencePort,
    @Inject(ANALYSIS_REPOSITORY)
    private readonly analysisRepo: IAnalysisRepository,
    private readonly http: HttpService,
    private readonly logger: AppLogger,
  ) {}

  async process(data: NuevaFrutaDto): Promise<void> {
    this.logger.info('Nueva fruta recibida', {
      imageId: data.image_id,
      storageKey: data.storage_key,
      userId: data.userId,
    });

    // V2 context: pass metadata from ingestion event to the inference adapter
    const context = {
      campoId: data.campoId,
      productorId: data.productorId,
      gpsLat: data.gpsLat,
      gpsLon: data.gpsLon,
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
      this.logger.error('Error al procesar inferencia', {
        imageId: data.image_id,
        storageKey: data.storage_key,
        error: (err as Error).message,
      });
      throw err;
    }

    // 2. Loguear resumen usando la entidad de dominio
    const m = analysis.metricas_salud;
    this.logger.info('Análisis completado', {
      imageId: analysis.image_id,
      totalDetectados: m.total_elementos_detectados,
      elementosSanos: m.elementos_sanos,
      porcentajeMerma: m.porcentaje_merma_general,
    });
    this.logger.info('Proyección de peso calculada', {
      imageId: analysis.image_id,
      pesoSanoGramos: analysis.proyeccion_financiera.peso_sano_gramos,
    });

    for (const etapa of analysis.cronograma_fenologico) {
      this.logger.info('Etapa fenológica calculada', {
        imageId: analysis.image_id,
        etapa: etapa.etapa,
        cantidad: etapa.cantidad,
        diasParaCosecha: etapa.prediccion.dias_para_cosecha,
      });
    }

    // 3. Persistir usando el repositorio
    let savedId: string | null = null;
    try {
      savedId = await this.analysisRepo.save(analysis);
      this.logger.info('Análisis guardado', {
        analysisId: savedId,
        campoId: analysis.campo_id,
      });
    } catch (err) {
      this.logger.error('Error al guardar el análisis', {
        imageId: analysis.image_id,
        error: (err as Error).message,
      });
      throw err;
    }

    // 4. Notificar al backend para que haga broadcast por WebSocket
    const traceId = traceContext.getStore()?.traceId;
    try {
      await this.http.axiosRef.post(
        `${envs.backendUrl}/api/v1/internal/notify`,
        {
          event: 'analisis_listo',
          data: {
            imageId: analysis.image_id,
            id: savedId,
            userId: data.userId ?? null,
          },
        },
        {
          timeout: 3000,
          headers: {
            'x-internal-token': envs.internalNotifyToken,
            ...(traceId && { 'x-trace-id': traceId }),
          },
        },
      );
    } catch {
      // Non-critical — la app hace polling de todas formas
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
    scopeFilter?: { productorId?: string; campoIds?: string[] },
  ) {
    return this.analysisRepo.findAll(page, limit, {
      imageId,
      userId,
      startDate,
      endDate,
      productorId: scopeFilter?.productorId,
      campoIds: scopeFilter?.campoIds,
    });
  }

  /** Retorna un análisis por su MongoDB _id */
  async findById(id: string) {
    const result = await this.analysisRepo.findById(id);
    if (!result) throw new NotFoundException(`Análisis ${id} no encontrado`);
    return result;
  }
}
