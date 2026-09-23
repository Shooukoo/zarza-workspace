import { BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import type { FastifyRequest } from 'fastify';
import { DamageClassificationController } from './damage-classification.controller';
import type { DamageClassificationService } from './damage-classification.service';
import type { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import type { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';

describe('DamageClassificationController', () => {
  let service: { classify: jest.Mock };
  let pipe: { transform: jest.Mock };
  let validator: { readAndValidate: jest.Mock };
  let controller: DamageClassificationController;
  const req = {} as FastifyRequest;
  const stream = Readable.from(Buffer.from('x'));
  const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  beforeEach(() => {
    service = { classify: jest.fn() };
    pipe = { transform: jest.fn() };
    validator = { readAndValidate: jest.fn() };
    controller = new DamageClassificationController(
      service as unknown as DamageClassificationService,
      pipe as unknown as MultipartImagePipe,
      validator as unknown as MagicNumberValidator,
    );
    pipe.transform.mockResolvedValue({ file: stream, filename: 'foto.jpg', mimetype: 'image/jpeg' });
  });

  it('parsea el multipart, valida la imagen y delega en el service', async () => {
    const result = { clase: 'sano', confianza: 0.9, probabilidades: [] };
    validator.readAndValidate.mockResolvedValue(buffer);
    service.classify.mockResolvedValue(result);

    await expect(controller.classify(req)).resolves.toEqual(result);

    expect(pipe.transform).toHaveBeenCalledWith(req);
    expect(validator.readAndValidate).toHaveBeenCalledWith(stream, 'image/jpeg');
    expect(service.classify).toHaveBeenCalledWith(buffer, 'foto.jpg', 'image/jpeg');
  });

  it('no llama al service si la imagen no pasa la validación', async () => {
    validator.readAndValidate.mockRejectedValue(
      new BadRequestException('Invalid file type. Only JPG and PNG are allowed.'),
    );

    await expect(controller.classify(req)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.classify).not.toHaveBeenCalled();
  });
});
