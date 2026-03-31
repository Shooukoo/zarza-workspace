import {
  PipeTransform,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import '@fastify/multipart';
import { ParsedMultipartDto } from '../dto/parsed-multipart.dto';

/**
 * Pipe que extrae y valida el contenido multipart del request de Fastify,
 * dejando el controlador limpio de lógica de parseo.
 * Responsabilidad: transformar Request → ParsedMultipartDto.
 */
@Injectable()
export class MultipartImagePipe
  implements PipeTransform<FastifyRequest, Promise<ParsedMultipartDto>>
{
  private readonly logger = new Logger(MultipartImagePipe.name);

  async transform(req: FastifyRequest): Promise<ParsedMultipartDto> {
    const parts = req.parts();
    let capturedAt: Date | null = null;
    let fileResult: Pick<ParsedMultipartDto, 'file' | 'filename' | 'mimetype'> | null = null;

    // V2 metadata
    let campoId:       string | null = null;
    let productorId:   string | null = null;
    let gpsLat:        number | null = null;
    let gpsLon:        number | null = null;
    let offlineSyncId: string | null = null;

    for await (const part of parts) {
      if (part.type === 'field') {
        const value = part.value as string;

        switch (part.fieldname) {
          case 'capturedAt': {
            const parsed = new Date(value);
            if (isNaN(parsed.getTime())) {
              throw new BadRequestException(
                `capturedAt is not a valid ISO 8601 date: "${value}"`,
              );
            }
            capturedAt = parsed;
            this.logger.debug(`capturedAt received: ${capturedAt.toISOString()}`);
            break;
          }
          case 'campo_id':
            campoId = value || null;
            break;
          case 'productor_id':
            productorId = value || null;
            break;
          case 'gps_lat': {
            const n = parseFloat(value);
            gpsLat = isNaN(n) ? null : n;
            break;
          }
          case 'gps_lon': {
            const n = parseFloat(value);
            gpsLon = isNaN(n) ? null : n;
            break;
          }
          case 'offline_sync_id':
            offlineSyncId = value || null;
            break;
        }
        continue;
      }

      if (part.type === 'file') {
        fileResult = {
          file:     part.file,
          filename: part.filename,
          mimetype: part.mimetype,
        };
        break;
      }
    }

    if (!fileResult) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      ...fileResult,
      capturedAt,
      campoId,
      productorId,
      gpsLat,
      gpsLon,
      offlineSyncId,
    };
  }
}

