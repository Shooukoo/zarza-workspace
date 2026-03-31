import {
  Controller,
  Post,
  Req,
  Res,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { IngestionService } from './ingestion.service';
import { ClientProxy } from '@nestjs/microservices';
import { MultipartImagePipe } from './pipes/multipart-image.pipe';
import type { ParsedMultipartDto } from './dto/parsed-multipart.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';


@Controller('ingestion')
@UseGuards(JwtAuthGuard)
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);
  private readonly pipe = new MultipartImagePipe();

  constructor(
    private readonly ingestionService: IngestionService,
    @Inject('FRUITS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
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

    // Extract authenticated user from JWT (set by JwtAuthGuard)
    const user = (req as any).user as { sub: string; email: string } | undefined;

    try {
      const result = await this.ingestionService.processImageUpload(
        file,
        filename,
        mimetype,
        capturedAt,
        campoId,
        productorId,
        gpsLat,
        gpsLon,
        offlineSyncId,
        user?.sub,
        user?.email,
      );

      this.client.emit('nueva_fruta', result);

      return res.status(201).send(result);
    } catch (error) {
      file.destroy();
      throw error;
    }
  }
}

