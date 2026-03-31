import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CamposService } from './campos.service';
import { CreateCampoDto } from './dto/create-campo.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';

/**
 * GET    /api/campos             → Lista todos los campos (ADMIN ve todos, PRODUCTOR ve los suyos)
 * GET    /api/campos/:id         → Detalle de un campo
 * POST   /api/campos             → Crear campo (ADMIN, PRODUCTOR)
 * DELETE /api/campos/:id         → Eliminar campo (ADMIN)
 */
@Controller('campos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamposController {
  constructor(private readonly camposService: CamposService) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  findAll(@Req() req: any, @Query('productor_id') productorId?: string) {
    // Si el usuario es ADMIN puede filtrar por productor_id o ver todos.
    // Si es PRODUCTOR, fuerza filtro por su propio ID.
    const user = req.user;
    const filterById =
      user.role === Role.PRODUCTOR ? user.sub : productorId;
    return this.camposService.findAll(filterById);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  findById(@Param('id') id: string) {
    return this.camposService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  create(@Body() dto: CreateCampoDto) {
    return this.camposService.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.camposService.delete(id);
  }
}
