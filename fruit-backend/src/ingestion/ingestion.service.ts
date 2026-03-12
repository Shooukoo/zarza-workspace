import { Injectable, Logger, Inject } from '@nestjs/common';
import { STORAGE_PORT } from '../storage/ports';
import type { IStoragePort } from '../storage/ports';

import { MagicNumberValidator } from './validators/magic-number.validator';
import { Readable } from 'stream';
import { UploadResultDto } from './dto/upload-result.dto';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    @Inject(STORAGE_PORT) private readonly storage: IStoragePort,
    private readonly validator: MagicNumberValidator,
  ) {}


  async processImageUpload(
    fileStream: Readable,
    filename: string,
    mimetype: string,
    capturedAt?: Date | null,
  ): Promise<UploadResultDto> {
    this.logger.log(`Processing upload: ${filename}`);

    // Lee el stream completo y valida el magic number.
    // Usar buffer en lugar de stream evita el socket hang up intermitente
    // que causaba stream.unshift() con Fastify multipart.
    const buffer = await this.validator.readAndValidate(fileStream, mimetype);
    this.logger.log(`File validated: ${filename} (${buffer.length} bytes)`);

    const storageKey = await this.storage.uploadBuffer(
      buffer,
      filename,
      mimetype,
    );

    const processedAt = new Date();
    const resolvedCapturedAt = capturedAt ?? processedAt;

    const result: UploadResultDto = {
      image_id: filename,
      storage_key: storageKey,
      metadata: {
        capturedAt: resolvedCapturedAt.toISOString(),
        processedAt: processedAt.toISOString(),
        size_bytes: buffer.length,
      },
      status: 'UPLOADED',
    };

    this.logger.log(
      `Upload complete: ${filename} | ${buffer.length} bytes | capturedAt=${result.metadata.capturedAt}`,
    );

    return result;
  }
}
