import { Injectable, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { envs } from '../config/envs';
import type { IStoragePort } from './ports';


@Injectable()
export class StorageService implements IStoragePort {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor() {
    this.bucketName = envs.r2BucketName;

    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: envs.r2Endpoint,
      forcePathStyle: false,
      credentials: {
        accessKeyId: envs.r2AccessKeyId,
        secretAccessKey: envs.r2SecretAccessKey,
      },
    });
  }

  async uploadBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `raw/${Date.now()}-${safeFilename}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ContentLength: buffer.length,
        },
      });

      this.logger.log(`Starting upload for ${key} (${buffer.length} bytes)`);
      await upload.done();
      this.logger.log(`Upload completed for ${key}`);
      return key;
    } catch (error) {
      this.logger.error(`Upload failed for ${key}`, error);
      throw error;
    }
  }
}
