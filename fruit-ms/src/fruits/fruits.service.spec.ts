import { FruitsService } from './fruits.service';
import { NuevaFrutaDto } from './dto/nueva-fruta.dto';

jest.mock('../config/envs', () => ({
  envs: {
    backendUrl: 'http://fruit-backend:3000',
    internalNotifyToken: 'x'.repeat(32),
  },
}));

describe('FruitsService.process', () => {
  const dto = { image_id: 'img-1', storage_key: 'k1' } as NuevaFrutaDto;

  const analysis = {
    image_id: 'img-1',
    campo_id: null,
    metricas_salud: {
      total_elementos_detectados: 1,
      elementos_sanos: 1,
      elementos_enfermos: 0,
      porcentaje_merma_general: 0,
    },
    proyeccion_financiera: { peso_sano_gramos: 100 },
    cronograma_fenologico: [],
  };

  let inference: { analyze: jest.Mock };
  let repo: { save: jest.Mock; findAll: jest.Mock; findById: jest.Mock };
  let http: { axiosRef: { post: jest.Mock } };
  let service: FruitsService;

  beforeEach(() => {
    inference = { analyze: jest.fn().mockResolvedValue(analysis) };
    repo = {
      save: jest.fn().mockResolvedValue('saved-id'),
      findAll: jest.fn(),
      findById: jest.fn(),
    };
    http = { axiosRef: { post: jest.fn().mockResolvedValue({}) } };
    service = new FruitsService(inference, repo, http as any);
  });

  it('propaga el error cuando la inferencia falla y no intenta guardar', async () => {
    inference.analyze.mockRejectedValue(new Error('inference down'));

    await expect(service.process(dto)).rejects.toThrow('inference down');
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('propaga el error cuando el guardado falla', async () => {
    repo.save.mockRejectedValue(new Error('db down'));

    await expect(service.process(dto)).rejects.toThrow('db down');
  });

  it('resuelve aunque la notificación al backend falle (no-crítica)', async () => {
    http.axiosRef.post.mockRejectedValue(new Error('backend down'));

    await expect(service.process(dto)).resolves.toBeUndefined();
    expect(repo.save).toHaveBeenCalled();
  });
});
