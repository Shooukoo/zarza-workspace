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
  ParseUUIDPipe,
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
  IsOptional,
  MinLength,
  IsArray,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    description: 'Nuevo rol asignado al usuario.',
    example: Role.AGRONOMO,
  })
  @IsEnum(Role)
  role: Role;
}

class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'Filtrar usuarios por rol.',
    example: Role.AGRONOMO,
  })
  @IsOptional()
  @IsEnum(Role)
  rol?: Role;
}

class CreateUserDto {
  @ApiProperty({
    description: 'Dirección de correo electrónico del usuario.',
    example: 'usuario@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Contraseña de usuario.',
    example: 'contraseña123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: Role,
    description: 'Rol asignado al nuevo usuario.',
    example: Role.PRODUCTOR,
  })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({
    description: 'Nombre del usuario.',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido del usuario.',
    example: 'Pérez',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

class UpdateNameDto {
  @ApiPropertyOptional({
    description: 'Nombre actualizado.',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Apellido actualizado.',
    example: 'Pérez',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

class UpdateCamposDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'ID de los campos asignados al usuario.',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    ],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  campos_ids: string[];
}

class UpdatePasswordDto {
  @ApiProperty({
    description: 'Nueva contraseña para el usuario.',
    example: 'nuevaContraseñad123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;
}

import { AdminDashboardService } from './admin-dashboard.service';

/**
 * Endpoints exclusivos para administradores.
 * Todos requieren JWT válido + rol ADMIN.
 *
 * GET  /api/v1/admin/users              → Lista paginada de usuarios
 * GET  /api/v1/admin/users/monitores    → Lista mínima de MONITORES (ADMIN + AGRONOMO)
 * PATCH /api/v1/admin/users/:id/role    → Cambia el rol de un usuario
 * GET  /api/v1/admin/stats              → Estadísticas globales del sistema
 * GET  /api/v1/admin/dashboard/yield    → Proyección de Cosecha
 * GET  /api/v1/admin/dashboard/health   → Resumen de Salud y Mermas
 * GET  /api/v1/admin/dashboard/phenology→ Distribución Fenológica
 */
@ApiTags('Admin')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @ApiOperation({
    summary: 'Listar usuarios',
    description:
      'Devuelve una lista paginada de usuarios con un filtro de rol opcional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Los usuarios recuperaron con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @Get('users')
  findAllUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.findAllUsers(query.page, query.limit, query.rol);
  }

  /**
   * Lista de solo lectura sin datos sensibles, para poblar selectores
   * (p.ej. "Asignar a" en Nueva Solicitud). AGRONOMO también puede crear
   * solicitudes y necesita ver los monitores disponibles, pero el resto
   * de /admin/users sigue siendo exclusivo de ADMIN.
   */
  @Get('users/monitores')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Listar los monitores disponibles',
    description:
      'Devuelve una lista de solo lectura de los monitores disponibles para su asignación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitores recuperados con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador o agrónomo.',
  })
  findMonitores() {
    return this.adminService.findMonitores();
  }

  @Post('users')
  @ApiOperation({
    summary: 'Crear un usuario',
    description:
      'Crea un nuevo usuario con el rol y la información de perfil especificados.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado con éxito.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de usuario no válidos o no se pudo crear el usuario.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  async createUser(@Body() dto: CreateUserDto) {
    try {
      return await this.adminService.createUser(
        dto.email,
        dto.password,
        dto.role,
        dto.firstName,
        dto.lastName,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new BadRequestException(msg);
    }
  }

  @Patch('users/:id/name')
  @ApiOperation({
    summary: 'Actualizar nombre de usuario',
    description: 'Actualiza el nombre y/o los apellidos de un usuario.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Usuario UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Nombre de usuario actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
  async updateUserName(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNameDto,
  ) {
    try {
      return await this.adminService.updateName(
        id,
        dto.firstName,
        dto.lastName,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('not found')) throw new NotFoundException(msg);
      throw new BadRequestException(msg);
    }
  }

  @Patch('users/:id/role')
  @ApiOperation({
    summary: 'Actualizar rol de usuario',
    description: 'Cambia el rol asignado a un usuario.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Usuario UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol de usuario actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Rol o datos de la solicitud no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
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
  @ApiOperation({
    summary: 'Actualizar campos de usuario',
    description: 'Actualiza los campos asignados a un usuario.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Usuario UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Las asignaciones de campos de usuario se han actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'IDs de campo o datos de solicitud no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
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
  @ApiOperation({
    summary: 'Eliminar un usuario',
    description: 'Elimina un usuario del sistema.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Usuario UUID.',
  })
  @ApiResponse({
    status: 204,
    description: 'Usuario eliminado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'El usuario no pudo ser eliminado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
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
  @ApiOperation({
    summary: 'Actualizar la contraseña del usuario',
    description: 'Cambia la contraseña de un usuario.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Usuario UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'La contraseña del usuario se ha actualizado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Contraseña o datos de la solicitud no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado.',
  })
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
  @ApiOperation({
    summary: 'Obtener estadísticas del sistema',
    description: 'Devuelve estadísticas globales del sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas recuperadas con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador.',
  })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/yield')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Obtener previsión de rendimiento',
    description: 'Devuelve el rendimiento proyectado del cultivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pronóstico de rendimiento obtenido con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador o productor.',
  })
  getYieldForecast(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getYieldForecast(productorId);
  }

  @Get('dashboard/health')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Obtener métricas de salud',
    description: 'Devuelve métricas de salud y pérdidas de los cultivos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de salud recuperadas con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador o productor.',
  })
  getHealthMetrics(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getHealthMetrics(productorId);
  }

  @Get('dashboard/phenology')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Obtener la distribución fenológica',
    description: 'Devuelve la distribución de los estadios fenológicos de los cultivos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Distribución fenológica recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Se requieren permisos de administrador o productor.',
  })
  getPhenologyDistribution(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getPhenologyDistribution(productorId);
  }
}
