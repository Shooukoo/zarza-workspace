import { Readable } from 'stream';

export const STORAGE_PORT = 'STORAGE_PORT';

/**
 * Puerto (interfaz) para el adaptador de almacenamiento de archivos.
 * IngestionService depende sólo de este contrato; sustituir R2 por
 * GCS o S3 nativo requiere crear una nueva clase que implemente esta interfaz
 * sin tocar la lógica de negocio.
 */
export interface IStoragePort {
  uploadBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string>;
}
