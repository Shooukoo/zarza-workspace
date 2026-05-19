import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
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
import {
  IsEmail,
  IsEnum,
  IsString,
  MinLength,
  IsArray,
  IsUUID,
} from 'class-validator';

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

class UpdateCamposDto {
  @IsArray()
  @IsUUID('4', { each: true })
  campos_ids: string[];
}

class UpdatePasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
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
    @Query('rol') rol?: string,
  ) {
    const role =
      rol && Object.values(Role).includes(rol as Role)
        ? (rol as Role)
        : undefined;
    return this.adminService.findAllUsers(page, limit, role);
  }

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    try {
      return await this.adminService.createUser(dto.email, dto.password, dto.role);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(msg);
    }
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    try {
      return await this.adminService.updateUserRole(id, dto.role);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('users/:id/campos')
  async updateUserCampos(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCamposDto,
  ) {
    try {
      return await this.adminService.updateCampos(id, dto.campos_ids);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    try {
      await this.adminService.deleteUser(id, req.user.sub as string);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('users/:id/password')
  async updateUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePasswordDto,
  ) {
    try {
      await this.adminService.updatePassword(id, dto.password);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/yield')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  getYieldForecast(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getYieldForecast(productorId);
  }

  @Get('dashboard/health')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  getHealthMetrics(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getHealthMetrics(productorId);
  }

  @Get('dashboard/phenology')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  getPhenologyDistribution(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getPhenologyDistribution(productorId);
  }
}
