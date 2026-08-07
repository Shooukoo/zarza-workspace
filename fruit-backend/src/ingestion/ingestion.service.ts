import { Injectable, Inject } from '@nestjs/common';
import { STORAGE_PORT } from '../storage/ports';
import type { IStoragePort } from '../storage/ports';

import { MagicNumberValidator } from './validators/magic-number.validator';
import { Readable } from 'stream';
import { UploadResultDto } from './dto/upload-result.dto';
import type { ProcessImageInput } from './dto/parsed-multipart.dto';
import { AppLogger } from '../common/logging/app.logger';
@Injectable()
export class IngestionService {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: IStoragePort,
    private readonly validator: MagicNumberValidator,
    private readonly logger: AppLogger,
  ) {}

  async processImageUpload(input: ProcessImageInput): Promise<UploadResultDto> {
    const {
      file,
      filename,
      mimetype,
      capturedAt,
      campoId,
      productorId,
      gpsLat,
      gpsLon,
      offlineSyncId,
      userId,
      userEmail,
    } = input;
    this.logger.info('Procesando carga de imagen', {
      imageId: filename,
    });

    const buffer = await this.validator.readAndValidate(file, mimetype);
    this.logger.info('Archivo validado', {
      imageId: filename,
      sizeBytes: buffer.length,
    });

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
      // V2 fields
      campoId: campoId ?? null,
      productorId: productorId ?? null,
      gpsLat: gpsLat ?? null,
      gpsLon: gpsLon ?? null,
      offlineSyncId: offlineSyncId ?? null,
      userId,
      userEmail,
    };

    this.logger.info('Carga de imagen finalizada', {
      imageId: filename,
      sizeBytes: buffer.length,
      capturedAt: result.metadata.capturedAt,
      campoId: campoId ?? null,
      storageKey,
      userId,
    });

    return result;
  }
}
