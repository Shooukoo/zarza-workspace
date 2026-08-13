import { TrainingInternalController } from './training-internal.controller';
import { TrainingService } from './training.service';
import { UnauthorizedException } from '@nestjs/common';

describe('TrainingInternalController', () => {
  const TOKEN = 'test-training-token';
  let trainingService: { getDataset: jest.Mock; recordTrainingComplete: jest.Mock };
  let controller: TrainingInternalController;

  beforeEach(() => {
    process.env.TRAINING_INTERNAL_TOKEN = TOKEN;
    trainingService = { getDataset: jest.fn(), recordTrainingComplete: jest.fn() };
    controller = new TrainingInternalController(trainingService as unknown as TrainingService);
  });

  describe('getDataset()', () => {
    it('rechaza un token inválido', async () => {
      await expect(controller.getDataset('wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('delega en TrainingService con un token válido', async () => {
      trainingService.getDataset.mockResolvedValue([]);

      const result = await controller.getDataset(TOKEN);

      expect(result).toEqual([]);
    });
  });

  describe('trainingComplete()', () => {
    it('rechaza un token inválido', async () => {
      await expect(
        controller.trainingComplete('wrong', { jobId: 'job-1', status: 'FAILED' } as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('delega en TrainingService con un token válido', async () => {
      await controller.trainingComplete(TOKEN, { jobId: 'job-1', status: 'FAILED' } as any);

      expect(trainingService.recordTrainingComplete).toHaveBeenCalledWith({
        jobId: 'job-1',
        status: 'FAILED',
      });
    });
  });
});
