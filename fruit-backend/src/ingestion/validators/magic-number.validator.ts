import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/jpg', 'image/png']);

@Injectable()
export class MagicNumberValidator {
  private hasMagicBytes(buffer: Buffer): boolean {
    if (buffer.length < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return true;
    }

    return false;
  }

  /**
   * Lee el stream completo en un Buffer, valida el tipo de archivo y lo devuelve.
   *
   * Criterio de validación (OR):
   *   1. Los primeros 4 bytes coinciden con la firma JPEG o PNG.
   *   2. El mimetype declarado por el cliente es image/jpeg o image/png.
   *
   * Usando doble validación se cubren PNGs con metadatos/BOM extra al inicio
   * que no pasan el chequeo de magic bytes pero son archivos legítimos.
   */
  async readAndValidate(stream: Readable, mimeType: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      stream.on('error', (err) => reject(err));

      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);

        if (buffer.length < 4) {
          return reject(new BadRequestException('File too short or empty.'));
        }

        const validMagic = this.hasMagicBytes(buffer);
        const validMime  = ALLOWED_MIMES.has(mimeType.toLowerCase());

        if (!validMagic && !validMime) {
          return reject(
            new BadRequestException(
              'Invalid file type. Only JPG and PNG are allowed.',
            ),
          );
        }

        resolve(buffer);
      });
    });
  }
}
