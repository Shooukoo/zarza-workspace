import { Controller, Post, Req, Res, Inject, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { IngestionService } from './ingestion.service';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { MultipartImagePipe } from './pipes/multipart-image.pipe';
import type { ParsedMultipartDto } from './dto/parsed-multipart.dto';
import type { ProcessImageInput } from './dto/parsed-multipart.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { traceContext } from '../common/logging/trace-context';
import { AppLogger } from '../common/logging/app.logger';
import { randomUUID } from 'crypto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadResultDto } from './dto/upload-result.dto';

@ApiTags('Ingestion')
@ApiBearerAuth()
@Controller('ingestion')
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly pipe: MultipartImagePipe,
    @Inject('FRUITS_SERVICE') private readonly client: ClientProxy,
    private readonly logger: AppLogger,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload fruit image',
    description: 'Uploads a fruit image and sends it for processing.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fruit image to upload.',
        },
        capturedAt: {
          type: 'string',
          format: 'date-time',
          description: 'Date and time when the image was captured.',
        },
        campoId: {
          type: 'string',
          description: 'ID of the field where the image was captured.',
        },
        productorId: {
          type: 'string',
          description: 'ID of the producer associated with the image.',
        },
        gpsLat: {
          type: 'number',
          format: 'double',
          description: 'Latitude where the image was captured.',
        },
        gpsLon: {
          type: 'number',
          format: 'double',
          description: 'Longitude where the image was captured.',
        },
        offlineSyncId: {
          type: 'string',
          description:
            'Identifier used to correlate an offline synchronization.',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image successfully uploaded.',
    type: UploadResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image or multipart data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  async upload(
    @Req() req: FastifyRequest & { id: string },
    @Res() res: FastifyReply,
  ) {
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
    }: ParsedMultipartDto = await this.pipe.transform(req);

    const user = (req as any).user as
      | { sub: string; email: string }
      | undefined;

    try {
      const result = await this.ingestionService.processImageUpload({
        file,
        filename,
        mimetype,
        capturedAt,
        campoId,
        productorId,
        gpsLat,
        gpsLon,
        offlineSyncId,
        userId: user?.sub,
        userEmail: user?.email,
      } satisfies ProcessImageInput);

      const traceId = traceContext.getStore()?.traceId ?? randomUUID();

      const record = new RmqRecordBuilder(result)
        .setOptions({
          headers: {
            'x-trace-id': traceId,
          },
        })
        .build();

      this.logger.info('Evento enviado a RabbitMQ', {
        imageId: result.image_id,
        storageKey: result.storage_key,
        userId: user?.sub,
      });
      await this.client.emit('nueva_fruta', record).toPromise();

      return res.status(201).send(result);
    } finally {
      if (!file.destroyed) file.destroy();
    }
  }
}
