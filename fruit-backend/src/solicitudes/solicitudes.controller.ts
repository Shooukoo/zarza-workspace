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
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Create sampling request',
    description: 'Creates a new fruit sampling request assigned to a monitor.',
  })
  @ApiResponse({
    status: 201,
    description: 'Sampling request created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators and agronomists can create requests.',
  })
  create(@Req() req: any, @Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(req.user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Get sampling request by ID',
    description:
      'Returns a specific sampling request accessible to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sampling request UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Sampling request retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access this request.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sampling request not found.',
  })
  findById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findById(id, req.user.sub, req.user.role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'List sampling requests',
    description:
      'Returns paginated sampling requests accessible to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sampling requests retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access requests.',
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
    summary: 'Update sampling request status',
    description: 'Updates the status of a sampling request.',
  })
  @ApiParam({
    name: 'id',
    description: 'Sampling request UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Sampling request status updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to update this request.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sampling request not found.',
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
