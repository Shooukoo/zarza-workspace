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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto, UpdateEstadoDto } from './dto/create-solicitud.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import type { EstadoSolicitud } from './schemas/solicitud-muestreo.schema';

/**
 * POST   /api/solicitudes              → Crear solicitud de muestreo (ADMIN)
 * GET    /api/solicitudes              → Listar solicitudes paginadas (ADMIN, AGRONOMO, MONITOR)
 * PATCH  /api/solicitudes/:id/estado  → Cambiar estado (ADMIN, AGRONOMO, MONITOR)
 */
@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Req() req: any, @Body() dto: CreateSolicitudDto) {
    return this.solicitudesService.create(req.user.sub, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('estado') estado?: EstadoSolicitud,
    @Query('campo_id') campo_id?: string,
  ) {
    const user = req.user;
    // Monitor solo ve sus propias solicitudes
    const asignado_a =
      user.role === Role.MONITOR ? user.sub : undefined;

    return this.solicitudesService.findAll(page, limit, { estado, campo_id, asignado_a });
  }

  @Patch(':id/estado')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.MONITOR)
  updateEstado(@Param('id') id: string, @Body() dto: UpdateEstadoDto) {
    return this.solicitudesService.updateEstado(id, dto.estado);
  }
}
