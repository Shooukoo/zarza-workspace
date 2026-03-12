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
    let fileResult: Omit<ParsedMultipartDto, 'capturedAt'> | null = null;

    for await (const part of parts) {
      if (part.type === 'field' && part.fieldname === 'capturedAt') {
        const raw = part.value as string;
        const parsed = new Date(raw);
        if (isNaN(parsed.getTime())) {
          throw new BadRequestException(
            `capturedAt is not a valid ISO 8601 date: "${raw}"`,
          );
        }
        capturedAt = parsed;
        this.logger.debug(`capturedAt received: ${capturedAt.toISOString()}`);
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

    return { ...fileResult, capturedAt };
  }
}
