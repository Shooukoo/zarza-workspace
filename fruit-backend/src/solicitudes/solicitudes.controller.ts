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
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import {
  CreateSolicitudDto,
  UpdateEstadoDto,
} from './dto/create-solicitud.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type EstadoSolicitud } from '@rubus/database';
import { ListSolicitudesQueryDto } from './dto/list-solicitudes-query.dto';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

/**
 * POST   /api/v1/solicitudes              → Crear solicitud de muestreo (ADMIN, AGRONOMO)
 * GET    /api/v1/solicitudes              → Listar solicitudes paginadas (ADMIN, AGRONOMO, MONITOR)
 * PATCH  /api/v1/solicitudes/:id/estado  → Cambiar estado (ADMIN, AGRONOMO, MONITOR)
 */
@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Solicitudes')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Crear solicitud de muestras',
    description: 'Crea una nueva solicitud de muestreo de fruta asignada a un monitor.',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitud de muestras creada con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de solicitud no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores y los agrónomos pueden crear solicitudes.',
  })
  create(@Req() req: any, @Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(req.user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Obtener solicitud de muestreo por ID',
    description:
      'Devuelve una solicitud de muestreo específica accesible para el usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la solicitud de muestreo.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud de muestreo recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a esta solicitud.',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la solicitud de muestreo.',
  })
  findById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findById(id, req.user.sub, req.user.role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Listar solicitudes de muestreo',
    description:
      'Devuelve solicitudes de muestreo paginadas accesibles para el usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitudes de muestreo recuperadas con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a las solicitudes.',
  })
  findAll(@Req() req: any, @Query() query: ListSolicitudesQueryDto) {
    const user = req.user;
    const asignado_a = user.role === Role.MONITOR ? user.sub : undefined;

    return this.solicitudesService.findAll(query.page, query.limit, {
      estado: query.estado,
      campo_id: query.campo_id,
      asignado_a,
    });
  }

  @Patch(':id/estado')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Actualizar el estado de la solicitud de muestreo',
    description: 'Actualiza el estado de una solicitud de muestreo.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID de la solicitud de muestreo.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'El estado de la solicitud de muestras se ha actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Estado no válido.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para actualizar esta solicitud.',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró la solicitud de muestreo.',
  })
  updateEstado(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoDto,
  ) {
    return this.solicitudesService.updateEstado(
      id,
      dto.estado,
      req.user.sub,
      req.user.role,
    );
  }
}
