import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { randomUUID } from 'crypto';
import { envs } from '../config/envs';
import { AppLogger } from '../common/logging/app.logger';
import { traceContext } from '../common/logging/trace-context';
import type { DamageClassificationResult } from './damage-classification.types';

const INFERENCE_TIMEOUT_MS = 30_000;

@Injectable()
export class DamageClassificationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly logger: AppLogger,
  ) {}

  /** Reenvía la imagen ya validada a fruit-inference y devuelve su clasificación. */
  async classify(
    image: Buffer,
    filename: string,
    mimetype: string,
  ): Promise<DamageClassificationResult> {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(image)], { type: mimetype }), filename);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<DamageClassificationResult>(
          `${envs.inferenceUrl}/classify-damage`,
          form,
          {
            headers: {
              'x-inference-token': envs.inferenceAuthToken,
              'x-trace-id': traceContext.getStore()?.traceId ?? randomUUID(),
            },
            timeout: INFERENCE_TIMEOUT_MS,
          },
        ),
      );
      return data;
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  private toHttpException(error: unknown): HttpException {
    if (isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 400 || status === 413) {
        const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
        return new BadRequestException(typeof detail === 'string' ? detail : 'Imagen inválida');
      }
      // Sin response = conexión rechazada o timeout; 503 = modelo no cargado.
      if (status === 503 || !error.response) {
        this.logger.warn('Servicio de clasificación de daños no disponible', {
          code: error.code,
          status,
        });
        return new ServiceUnavailableException('Servicio de clasificación no disponible');
      }
    }
    this.logger.error('Error inesperado al clasificar daños', {
      status: isAxiosError(error) ? error.response?.status : undefined,
      code: isAxiosError(error) ? error.code : undefined,
      error: error instanceof Error ? error.message : String(error),
    });
    return new BadGatewayException('Error al clasificar la imagen');
  }
}
