import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(Role)
  role: Role;
}

class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role)
  role: Role;
}

import { AdminDashboardService } from './admin-dashboard.service';

/**
 * Endpoints exclusivos para administradores.
 * Todos requieren JWT válido + rol ADMIN.
 *
 * GET  /api/admin/users              → Lista paginada de usuarios
 * PATCH /api/admin/users/:id/role    → Cambia el rol de un usuario
 * GET  /api/admin/stats              → Estadísticas globales del sistema
 * GET  /api/admin/dashboard/yield    → Proyección de Cosecha
 * GET  /api/admin/dashboard/health   → Resumen de Salud y Mermas
 * GET  /api/admin/dashboard/phenology→ Distribución Fenológica
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @Get('users')
  findAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.findAllUsers(page, limit);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    try {
      return await this.adminService.createUser(dto.email, dto.password, dto.role);
    } catch (e: any) {
      throw new BadRequestException(e.message);
    }
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    try {
      return await this.adminService.updateUserRole(id, dto.role);
    } catch (e: any) {
      if (e.message?.includes('not found')) throw new NotFoundException(e.message);
      throw new BadRequestException(e.message);
    }
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/yield')
  getYieldForecast() {
    return this.dashboardService.getYieldForecast();
  }

  @Get('dashboard/health')
  getHealthMetrics() {
    return this.dashboardService.getHealthMetrics();
  }

  @Get('dashboard/phenology')
  getPhenologyDistribution() {
    return this.dashboardService.getPhenologyDistribution();
  }
}
