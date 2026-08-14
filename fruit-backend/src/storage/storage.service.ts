import { Injectable } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { envs } from '../config/envs';
import type { IStoragePort } from './ports';
import { AppLogger } from '../common/logging/app.logger';

@Injectable()
export class StorageService implements IStoragePort {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly logger: AppLogger) {
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

  async uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string> {
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
      this.logger.info('Iniciando carga a almacenamiento', {
        storageKey: key,
        sizeBytes: buffer.length,
      });
      await upload.done();
      this.logger.info('Archivo almacenado', {
        storageKey: key,
      });
      return key;
    } catch (error) {
      this.logger.error('Error al cargar archivo', {
        storageKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async downloadBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      const response = await this.s3Client.send(command);
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Error al descargar archivo', {
        storageKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPresignedUrl(key: string, expiresIn: number): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error('Error al generar URL prefirmada', {
        storageKey: key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
