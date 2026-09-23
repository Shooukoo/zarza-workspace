import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { HttpService } from '@nestjs/axios';
import { AxiosError, type AxiosResponse } from 'axios';
import { of, throwError } from 'rxjs';
import type { AppLogger } from '../common/logging/app.logger';
import { traceContext } from '../common/logging/trace-context';
import { envs } from '../config/envs';
import { DamageClassificationService } from './damage-classification.service';

function axiosErrorWithStatus(status: number, data: unknown): AxiosError {
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data,
  } as AxiosResponse);
}

describe('DamageClassificationService', () => {
  let httpService: { post: jest.Mock };
  let logger: { info: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };
  let service: DamageClassificationService;
  const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  beforeEach(() => {
    httpService = { post: jest.fn() };
    logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    service = new DamageClassificationService(
      httpService as unknown as HttpService,
      logger as unknown as AppLogger,
    );
  });

  it('reenvía la imagen como multipart con el token interno y devuelve el resultado', async () => {
    const result = {
      clase: 'sano',
      confianza: 0.97,
      probabilidades: [{ clase: 'sano', confianza: 0.97 }],
    };
    httpService.post.mockReturnValue(of({ data: result }));

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).resolves.toEqual(result);

    const [url, body, config] = httpService.post.mock.calls[0];
    expect(url).toBe(`${envs.inferenceUrl}/classify-damage`);
    expect(config).toEqual(
      expect.objectContaining({
        headers: {
          'x-inference-token': envs.inferenceAuthToken,
          'x-trace-id': expect.any(String),
        },
        timeout: 30_000,
      }),
    );
    expect(body).toBeInstanceOf(FormData);
    const file = (body as FormData).get('file') as File;
    expect(file.name).toBe('foto.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(Buffer.from(await file.arrayBuffer())).toEqual(image);
  });

  it('propaga el traceId del contexto activo como header x-trace-id', async () => {
    const result = {
      clase: 'sano',
      confianza: 0.97,
      probabilidades: [{ clase: 'sano', confianza: 0.97 }],
    };
    httpService.post.mockReturnValue(of({ data: result }));

    await traceContext.run({ traceId: 'trace-123' }, () =>
      service.classify(image, 'foto.jpg', 'image/jpeg'),
    );

    const [, , config] = httpService.post.mock.calls[0];
    expect(config).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-trace-id': 'trace-123' }),
      }),
    );
  });

  it('mapea un 400 de inferencia a BadRequest con su detail', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(400, { detail: 'Imagen inválida' })),
    );

    const promise = service.classify(image, 'foto.jpg', 'image/jpeg');

    await expect(promise).rejects.toBeInstanceOf(BadRequestException);
    await expect(promise).rejects.toThrow('Imagen inválida');
  });

  it('mapea un 413 de inferencia a BadRequest', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(413, { detail: 'Imagen demasiado grande' })),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
      new BadRequestException('Imagen demasiado grande'),
    );
  });

  it('mapea un 503 de inferencia (modelo no cargado) a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(503, { detail: 'Modelo no disponible' })),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toThrow(
      new ServiceUnavailableException('Servicio de clasificación no disponible'),
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('mapea conexión rechazada (sin response) a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('connect ECONNREFUSED', 'ECONNREFUSED')),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(logger.warn).toHaveBeenCalled();
  });

  it('mapea timeout a ServiceUnavailable', async () => {
    httpService.post.mockReturnValue(
      throwError(() => new AxiosError('timeout of 30000ms exceeded', 'ECONNABORTED')),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('mapea cualquier otro error a BadGateway y lo registra', async () => {
    httpService.post.mockReturnValue(throwError(() => axiosErrorWithStatus(500, {})));

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('mapea un 401 (token inválido) a BadGateway y lo registra con el status', async () => {
    httpService.post.mockReturnValue(
      throwError(() => axiosErrorWithStatus(401, { detail: 'Unauthorized' })),
    );

    await expect(service.classify(image, 'foto.jpg', 'image/jpeg')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: 401 }),
    );
  });
});
