import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { envs } from '../config/envs';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';
import { AnalyzeRequestDto } from './dto/analyze-request.dto';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { ANALYSIS_REPOSITORY } from './ports';
import type { IAnalysisRepository } from './ports';

import { InferenceMapper } from './infrastructure/inference.mapper';

@Injectable()
export class FruitsService {
  private readonly logger = new Logger(FruitsService.name);

  constructor(
    private readonly httpService: HttpService,
    @Inject(ANALYSIS_REPOSITORY)
    private readonly analysisRepo: IAnalysisRepository,
  ) {}

  async process(data: NuevaFrutaDto): Promise<void> {
    this.logger.log(
      `Nueva fruta recibida | id=${data.image_id} | key=${data.storage_key}`,
    );

    // 1. Construir el request hacia fruit-inference
    const requestBody: AnalyzeRequestDto = {
      storage_key: data.storage_key,
      image_id:    data.image_id,
    };

    // 2. Llamar al servicio de inferencia Python
    let inferenceDto: AnalysisResponseDto;
    try {
      const response = await firstValueFrom(
        this.httpService.post<AnalysisResponseDto>(
          `${envs.inferenceUrl}/analyze`,
          requestBody,
          { timeout: 60_000 },
        ),
      );
      inferenceDto = response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `Error al llamar a fruit-inference: ${axiosErr.message}`,
        axiosErr.response?.data,
      );
      return;
    }

    // 3. Mapear DTO de red → entidad de dominio (desacoplamiento del contrato HTTP)
    const analysis = InferenceMapper.toDomain(inferenceDto, data.storage_key);

    // 4. Loguear resumen usando la entidad de dominio
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

    // 5. Persistir usando el repositorio (no sabe nada de Mongoose)
    try {
      const savedId = await this.analysisRepo.save(analysis);
      this.logger.log(`[MongoDB] Análisis guardado | _id=${savedId}`);
    } catch (err) {
      this.logger.error(
        `[MongoDB] Error al guardar el análisis: ${(err as Error).message}`,
      );
    }
  }

  /** Retorna análisis paginados ordenados del más reciente al más antiguo */
  async findAll(page: number, limit: number, imageId?: string) {
    return this.analysisRepo.findAll(page, limit, { imageId });
  }

  /** Retorna un análisis por su MongoDB _id */
  async findById(id: string) {
    const result = await this.analysisRepo.findById(id);
    if (!result) throw new NotFoundException(`Análisis ${id} no encontrado`);
    return result;
  }
}
