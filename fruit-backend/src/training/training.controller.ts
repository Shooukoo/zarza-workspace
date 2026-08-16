import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TrainingService } from './training.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';

@ApiTags('Training')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @ApiOperation({
    summary: 'Estado del pipeline de reentrenamiento',
    description:
      'Modelo activo, contador de análisis revisados nuevos, umbral mínimo, job activo e historial.',
  })
  @ApiResponse({ status: 200, description: 'Estado recuperado con éxito.' })
  @ApiResponse({ status: 403, description: 'Solo ADMIN puede acceder.' })
  @Get('status')
  async getStatus() {
    return this.trainingService.getStatus();
  }

  @ApiOperation({
    summary: 'Iniciar un entrenamiento nuevo',
    description:
      'Crea un TrainingJob y dispara el fine-tuning en fruit-training. 409 si ya hay un job activo o no se alcanza el umbral mínimo.',
  })
  @ApiResponse({ status: 201, description: 'Job creado y disparado con éxito.' })
  @ApiResponse({ status: 409, description: 'Ya hay un job activo, o no se alcanza el umbral.' })
  @Post('jobs')
  async createJob(@Req() req: { user: JwtPayload }) {
    return this.trainingService.createJob(req.user.sub);
  }

  @ApiOperation({
    summary: 'Promover una versión del modelo',
    description:
      'Promueve el ModelVersion asociado a un job (LISTO_PARA_PROMOVER o REEMPLAZADO — cubre promoción normal y rollback).',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'UUID del TrainingJob.' })
  @ApiResponse({ status: 200, description: 'Versión promovida con éxito.' })
  @ApiResponse({ status: 400, description: 'La versión no está en un estado promovible.' })
  @ApiResponse({ status: 404, description: 'No hay una versión asociada a ese job.' })
  @Post('jobs/:id/promote')
  @HttpCode(HttpStatus.OK)
  async promote(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    return this.trainingService.promote(id, req.user.sub);
  }
}
