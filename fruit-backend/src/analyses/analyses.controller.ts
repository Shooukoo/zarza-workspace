import {
  Controller,
  Get,
  Post,
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
import { CreateDetectionDto } from './dto/create-detection.dto';
import { DetectionFeedbackDto } from './dto/detection-feedback.dto';
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
      query.revision_detecciones,
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
    this.assertInScope(analysis, scope);
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

  @ApiOperation({
    summary: 'Listar las detecciones de un análisis',
    description:
      'Devuelve las detecciones individuales del análisis con su estado actual ya resuelto (original del modelo, o la corrección más reciente si existe).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detecciones recuperadas con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a las detecciones.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Get(':id/detections')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async listDetections(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    await this.assertAccessToAnalysis(id, req.user);
    return this.analysesService.listDetections(id);
  }

  @ApiOperation({
    summary: 'Agregar una detección que el modelo no detectó',
    description:
      'Crea una detección de origen humano (el agrónomo dibujó el bounding box en la pantalla de revisión).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detección agregada con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de la detección no válidos (bbox inválido).',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para agregar detecciones.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Post(':id/detections')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async addDetection(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: CreateDetectionDto,
  ) {
    await this.assertAccessToAnalysis(id, req.user);
    return this.analysesService.addDetection(id, req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Corregir o eliminar una detección',
    description:
      'Registra una corrección (EDITAR) o marca una detección como falso positivo (ELIMINAR). Append-only: no modifica la detección original.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiParam({
    name: 'detectionId',
    type: String,
    format: 'uuid',
    description: 'UUID de la detección a corregir.',
  })
  @ApiResponse({
    status: 200,
    description: 'Corrección registrada con éxito.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos de la corrección no válidos (bbox inválido, o accion=EDITAR sin etapaCorregida/saludCorregida).',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para corregir detecciones.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis o detección no encontrados.',
  })
  @Post(':id/detections/:detectionId/feedback')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async addDetectionFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('detectionId', ParseUUIDPipe) detectionId: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: DetectionFeedbackDto,
  ) {
    await this.assertAccessToAnalysis(id, req.user);
    return this.analysesService.addFeedback(
      id,
      detectionId,
      req.user.sub,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Marcar un análisis como revisado',
    description:
      'Marca deteccionesRevisadas=true sin necesidad de haber registrado correcciones (caso: el agrónomo revisó y todo estaba correcto).',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'UUID del análisis.',
  })
  @ApiResponse({
    status: 200,
    description: 'Análisis marcado como revisado con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para marcar el análisis como revisado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Análisis no encontrado.',
  })
  @Patch(':id/review')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async markReviewed(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    await this.assertAccessToAnalysis(id, req.user);
    return this.analysesService.markReviewed(id, req.user.sub);
  }

  private assertInScope(
    analysis: { productorId: string; campoId: string },
    scope: UserScope,
  ) {
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
  }

  private async assertAccessToAnalysis(
    id: string,
    jwtUser: JwtPayload,
  ): Promise<void> {
    const scope = await this.buildScope(jwtUser);
    const analysis = await this.analysesService.findScopeInfo(id);
    this.assertInScope(analysis, scope);
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
