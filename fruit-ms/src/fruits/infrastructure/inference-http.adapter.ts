import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { envs } from '../../config/envs';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import { AnalysisDomain, UserSnapshot } from '../domain/analysis.entity';
import type { IInferencePort } from '../ports/inference.port';
import { InferenceMapper } from './inference.mapper';

/**
 * Adaptador de infraestructura que implementa IInferencePort usando HTTP.
 * Encapsula TODA la comunicación con fruit-inference: URL, timeout,
 * manejo de errores Axios y la transformación DTO → dominio.
 *
 * FruitsService NO conoce nada de este adaptador.
 */
@Injectable()
export class InferenceHttpAdapter implements IInferencePort {
  private readonly logger = new Logger(InferenceHttpAdapter.name);

  constructor(private readonly httpService: HttpService) {}

  async analyze(
    imageId: string,
    storageKey: string,
    requester: UserSnapshot,
  ): Promise<AnalysisDomain> {
    let inferenceDto: AnalysisResponseDto;

    try {
      const response = await firstValueFrom(
        this.httpService.post<AnalysisResponseDto>(
          `${envs.inferenceUrl}/analyze`,
          { storage_key: storageKey, image_id: imageId },
          { timeout: 60_000 },
        ),
      );
      inferenceDto = response.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error(
        `[InferenceHttpAdapter] Error al llamar a fruit-inference: ${axiosErr.message}`,
        axiosErr.response?.data,
      );
      throw new Error(`Inference service unavailable: ${axiosErr.message}`);
    }

    // Transformar DTO de red → entidad de dominio (el mapper vive en infraestructura)
    return InferenceMapper.toDomain(inferenceDto, storageKey, requester);
  }
}

