import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { envs } from '../../config/envs';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import { AnalysisDomain, UserSnapshot } from '../domain/analysis.entity';
import type { IInferencePort, InferenceContext } from '../ports/inference.port';
import { InferenceMapper } from './inference.mapper';
import { traceContext } from '../../common/logging/trace-context';
import { AppLogger } from '../../common/logging/app.logger';
import { randomUUID } from 'crypto';
/**
 * Adaptador de infraestructura que implementa IInferencePort usando HTTP.
 * Encapsula TODA la comunicación con fruit-inference: URL, timeout,
 * manejo de errores Axios y la transformación DTO → dominio.
 *
 * FruitsService NO conoce nada de este adaptador.
 */
@Injectable()
export class InferenceHttpAdapter implements IInferencePort {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLogger,
  ) {}

  async analyze(
    imageId: string,
    storageKey: string,
    requester: UserSnapshot,
    context?: InferenceContext,
  ): Promise<AnalysisDomain> {
    let inferenceDto: AnalysisResponseDto;

    const traceId = traceContext.getStore()?.traceId ?? randomUUID();

    try {
      const response = await firstValueFrom(
        this.httpService.post<AnalysisResponseDto>(
          `${envs.inferenceUrl}/analyze`,
          { storage_key: storageKey, image_id: imageId },
          {
            timeout: 60_000,
            headers: {
              'x-inference-token': envs.inferenceAuthToken,
              'x-trace-id': traceId,
            },
          },
        ),
      );
      inferenceDto = response.data;
      this.logger.info('Respuesta de inferencia recibida', {
        imageId,
        storageKey,
      });
    } catch (err) {
      const axiosErr = err as AxiosError;
      this.logger.error('Error al llamar al servicio de inferencia', {
        imageId,
        storageKey,
        error: axiosErr.message,
        statusCode: axiosErr.response?.status,
      });
      throw new Error(`Inference service unavailable: ${axiosErr.message}`);
    }

    // Transformar DTO de red → entidad de dominio (el mapper vive en infraestructura)
    return InferenceMapper.toDomain(
      inferenceDto,
      storageKey,
      requester,
      context,
    );
  }
}
