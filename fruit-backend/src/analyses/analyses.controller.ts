import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ANALYSIS_ESTADO_VALUES,
  ListAnalysesQueryDto,
} from './dto/list-analyses-query.dto';

@ApiTags('Analyses')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @ApiOperation({
    summary: 'Listar los análisis de frutas',
    description:
      'Devuelve una lista paginada de análisis según el rol del usuario autenticado y los filtros opcionales.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis recuperados con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a los análisis.',
  })
  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: { user: JwtPayload },
    @Query() query: ListAnalysesQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(
      query.page,
      query.limit,
      query.estado,
      scope,
      query.campo_id,
    );
  }

  @ApiOperation({
    summary: 'Obtener la URL de la imagen de análisis',
    description:
      'Devuelve una URL para acceder a la imagen asociada a un análisis.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'URL de la imagen recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a la imagen.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @ApiOperation({
    summary: 'Obtén un análisis',
    description: 'Devuelve los detalles de un análisis de fruta específico.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis recuperado con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a este análisis.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    if (scope.role === Role.PRODUCTOR && analysis.productorId !== scope.sub) {
      throw new NotFoundException();
    }
    if (
      scope.role === Role.AGRONOMO &&
      scope.camposAsignados?.length &&
      !scope.camposAsignados.includes(analysis.campoId ?? '')
    ) {
      throw new NotFoundException();
    }
    return analysis;
  }

  @ApiOperation({
    summary: 'Validar o rechazar un análisis',
    description:
      'Permite a un agrónomo o administrador validar o rechazar un análisis de fruta.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'La validación del análisis se completó con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de validación no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para validar análisis.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Patch(':id/validate')
  @Roles(Role.AGRONOMO, Role.ADMIN)
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    const result = await this.analysesService.validate(id, req.user.sub, dto);
    if (result.productorId) {
      this.notificationsGateway.emitToUser(
        result.productorId,
        'analysis_validated',
        {
          analysisId: id,
          action: dto.action,
          validatedBy: req.user.email,
          productorId: result.productorId,
        },
      );
    }
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.AGRONOMO) {
      const user = await this.userRepository.findById(jwtUser.sub);
      return {
        role: jwtUser.role,
        sub: jwtUser.sub,
        camposAsignados: user?.camposAsignados ?? [],
      };
    }
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
