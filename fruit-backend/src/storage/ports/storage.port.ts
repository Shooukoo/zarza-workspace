export const STORAGE_PORT = 'STORAGE_PORT';

export interface IStoragePort {
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string>;
  getPresignedUrl(key: string, expiresIn: number): Promise<string>;
  downloadBuffer(key: string): Promise<Buffer>;
}
