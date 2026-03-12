import {
  Controller,
  Post,
  Req,
  Res,
  Inject,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { FastifyRequest } from 'fastify';
import { IngestionService } from './ingestion.service';
import { ClientProxy } from '@nestjs/microservices';
import { MultipartImagePipe } from './pipes/multipart-image.pipe';
import type { ParsedMultipartDto } from './dto/parsed-multipart.dto';


@Controller('ingestion')
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);
  private readonly pipe = new MultipartImagePipe();

  constructor(
    private readonly ingestionService: IngestionService,
    @Inject('FRUITS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('upload')
  async upload(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const { file, filename, mimetype, capturedAt } =
      await this.pipe.transform(req);

    try {
      const result = await this.ingestionService.processImageUpload(
        file,
        filename,
        mimetype,
        capturedAt,
      );

      this.client.emit('nueva_fruta', result);

      return res.status(201).send(result);
    } catch (error) {
      file.destroy();
      throw error;
    }
  }
}
