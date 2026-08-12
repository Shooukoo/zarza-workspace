import { of } from 'rxjs';
import { InferenceHttpAdapter } from './inference-http.adapter';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import type { UserSnapshot } from '../domain/analysis.entity';

jest.mock('../../config/envs', () => ({
  envs: {
    inferenceUrl: 'http://fruit-inference:8000',
    inferenceAuthToken: 'test-inference-token',
  },
}));

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

describe('InferenceHttpAdapter', () => {
  let httpService: { post: jest.Mock };
  let adapter: InferenceHttpAdapter;

  const requester: UserSnapshot = { userId: 'u1', email: 'a@a.com' };

  const validResponse: AnalysisResponseDto = {
    image_id: 'img-1',
    variedad: null,
    fecha_analisis: '2026-07-08T00:00:00.000Z',
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 100 },
    cronograma_fenologico: [],
    detecciones: [],
  };

  beforeEach(() => {
    httpService = { post: jest.fn() };

    adapter = new InferenceHttpAdapter(httpService as any, logger as any);
  });

  it('envía el header x-inference-token en la llamada a /analyze', async () => {
    httpService.post.mockReturnValue(of({ data: validResponse }));

    await adapter.analyze('img-1', 'storage-key-1', requester);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://fruit-inference:8000/analyze',
      { storage_key: 'storage-key-1', image_id: 'img-1' },
      {
        timeout: 60_000,
        headers: {
          'x-inference-token': 'test-inference-token',
          'x-trace-id': expect.any(String),
        },
      },
    );
  });
});
