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
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    description: 'New role assigned to the user.',
    example: Role.AGRONOMO,
  })
  @IsEnum(Role)
  role: Role;
}

class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: Role,
    description: 'Filter users by role.',
    example: Role.AGRONOMO,
  })
  @IsOptional()
  @IsEnum(Role)
  rol?: Role;
}

class CreateUserDto {
  @ApiProperty({
    description: 'User email address.',
    example: 'usuario@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password.',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    enum: Role,
    description: 'Role assigned to the new user.',
    example: Role.PRODUCTOR,
  })
  @IsEnum(Role)
  role: Role;

  @ApiPropertyOptional({
    description: 'User first name.',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name.',
    example: 'Pérez',
  })
  @IsOptional()
  @IsString()
  lastName?: string;
}

class UpdateNameDto {
  @ApiPropertyOptional({
    description: 'Updated first name.',
    example: 'Juan',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Updated last name.',
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
    description: 'IDs of the fields assigned to the user.',
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
    description: 'New password for the user.',
    example: 'newPassword123',
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
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly dashboardService: AdminDashboardService,
  ) {}

  @ApiOperation({
    summary: 'List users',
    description:
      'Returns a paginated list of users with an optional role filter.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of users per page.',
    example: 10,
  })
  @ApiQuery({
    name: 'rol',
    required: false,
    enum: Role,
    description: 'Filter users by role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
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
    summary: 'List available monitors',
    description:
      'Returns a read-only list of monitors available for assignment.',
  })
  @ApiResponse({
    status: 200,
    description: 'Monitors retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator or agronomist permissions required.',
  })
  findMonitores() {
    return this.adminService.findMonitores();
  }

  @Post('users')
  @ApiOperation({
    summary: 'Create a user',
    description:
      'Creates a new user with the specified role and profile information.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid user data or user could not be created.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
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
    summary: 'Update user name',
    description: 'Updates the first name and/or last name of a user.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'User UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User name updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
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
    summary: 'Update user role',
    description: 'Changes the role assigned to a user.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'User UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid role or request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
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
    summary: 'Update user fields',
    description: 'Updates the fields assigned to a user.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'User UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User field assignments updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid field IDs or request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
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
    summary: 'Delete a user',
    description: 'Deletes a user from the system.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'User UUID.',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'User could not be deleted.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
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
    summary: 'Update user password',
    description: 'Changes the password of a user.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'User UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User password updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid password or request data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
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
    summary: 'Get system statistics',
    description: 'Returns global statistics for the system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator permissions required.',
  })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('dashboard/yield')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Get yield forecast',
    description: 'Returns the projected crop yield.',
  })
  @ApiResponse({
    status: 200,
    description: 'Yield forecast retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator or producer permissions required.',
  })
  getYieldForecast(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getYieldForecast(productorId);
  }

  @Get('dashboard/health')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Get health metrics',
    description: 'Returns crop health and loss metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Health metrics retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator or producer permissions required.',
  })
  getHealthMetrics(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getHealthMetrics(productorId);
  }

  @Get('dashboard/phenology')
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Get phenology distribution',
    description: 'Returns the phenological stage distribution of crops.',
  })
  @ApiResponse({
    status: 200,
    description: 'Phenology distribution retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Administrator or producer permissions required.',
  })
  getPhenologyDistribution(@Req() req: any) {
    const productorId =
      req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
    return this.dashboardService.getPhenologyDistribution(productorId);
  }
}
