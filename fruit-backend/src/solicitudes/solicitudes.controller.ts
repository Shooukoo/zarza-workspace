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

/**
 * POST   /api/v1/solicitudes              → Crear solicitud de muestreo (ADMIN, AGRONOMO)
 * GET    /api/v1/solicitudes              → Listar solicitudes paginadas (ADMIN, AGRONOMO, MONITOR)
 * PATCH  /api/v1/solicitudes/:id/estado  → Cambiar estado (ADMIN, AGRONOMO, MONITOR)
 */
@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.AGRONOMO)
  create(@Req() req: any, @Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(req.user.sub, dto);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  findById(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudesService.findById(id, req.user.sub, req.user.role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
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
