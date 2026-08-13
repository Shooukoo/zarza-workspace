import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

describe('TrainingController', () => {
  let trainingService: {
    getStatus: jest.Mock;
    createJob: jest.Mock;
    promote: jest.Mock;
  };
  let controller: TrainingController;

  beforeEach(() => {
    trainingService = {
      getStatus: jest.fn(),
      createJob: jest.fn(),
      promote: jest.fn(),
    };
    controller = new TrainingController(trainingService as unknown as TrainingService);
  });

  it('getStatus() delega en TrainingService', async () => {
    trainingService.getStatus.mockResolvedValue({ activeModel: null });

    const result = await controller.getStatus();

    expect(result).toEqual({ activeModel: null });
  });

  it('createJob() delega el userId del JWT', async () => {
    trainingService.createJob.mockResolvedValue({ jobId: 'job-1' });

    const result = await controller.createJob({ user: { sub: 'user-1' } } as any);

    expect(trainingService.createJob).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ jobId: 'job-1' });
  });

  it('promote() delega el id del job y el userId del JWT', async () => {
    trainingService.promote.mockResolvedValue({ id: 'mv-1', status: 'PROMOVIDO' });

    const result = await controller.promote('job-1', { user: { sub: 'user-1' } } as any);

    expect(trainingService.promote).toHaveBeenCalledWith('job-1', 'user-1');
    expect(result).toEqual({ id: 'mv-1', status: 'PROMOVIDO' });
  });
});
