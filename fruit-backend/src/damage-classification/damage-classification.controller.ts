import { Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { MultipartImagePipe } from '../ingestion/pipes/multipart-image.pipe';
import { MagicNumberValidator } from '../ingestion/validators/magic-number.validator';
import { DamageClassificationService } from './damage-classification.service';
import type { DamageClassificationResult } from './damage-classification.types';

@ApiTags('Damage Classification')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('damage-classification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DamageClassificationController {
  constructor(
    private readonly damageClassificationService: DamageClassificationService,
    private readonly pipe: MultipartImagePipe,
    private readonly validator: MagicNumberValidator,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Clasificar fruta enferma o dañada (provisional)',
    description:
      'Clasifica una foto con el modelo de daños de fruit-inference. No persiste nada.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Foto JPG o PNG (máx. 5 MB).' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Clase más probable y probabilidades de todas.' })
  @ApiResponse({ status: 400, description: 'Archivo ausente o imagen inválida.' })
  @ApiResponse({ status: 401, description: 'Se requiere autenticación.' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN puede acceder.' })
  @ApiResponse({ status: 413, description: 'Archivo mayor a 5 MB.' })
  @ApiResponse({ status: 502, description: 'Error inesperado del servicio de clasificación.' })
  @ApiResponse({ status: 503, description: 'Servicio o modelo de clasificación no disponible.' })
  async classify(@Req() req: FastifyRequest): Promise<DamageClassificationResult> {
    const { file, filename, mimetype } = await this.pipe.transform(req);
    const image = await this.validator.readAndValidate(file, mimetype);
    return this.damageClassificationService.classify(image, filename, mimetype);
  }
}
