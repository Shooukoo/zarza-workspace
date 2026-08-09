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
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { CamposService } from './campos.service';
import { CreateCampoDto } from './dto/create-campo.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('campos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Campos')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class CamposController {
  constructor(
    private readonly camposService: CamposService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Listar campos',
    description:
      'Devuelve los campos accesibles para el usuario autenticado. Los administradores pueden filtrar opcionalmente por productor.',
  })
  @ApiQuery({
    name: 'productor_id',
    required: false,
    description: 'UUID del productor utilizado para filtrar campos.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Campos recuperados con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a los campos.',
  })
  async findAll(
    @Req() req: { user: JwtPayload },
    @Query('productor_id') productorId?: string,
  ) {
    const { user } = req;
    if (user.role === Role.AGRONOMO) {
      const userDoc = await this.userRepository.findById(user.sub);
      return this.camposService.findByIds(userDoc?.camposAsignados ?? []);
    }
    const filterById = user.role === Role.PRODUCTOR ? user.sub : productorId;
    return this.camposService.findAll(filterById);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'Obtener campo por ID',
    description:
      'Devuelve los detalles de un campo específico accesible para el usuario autenticado.',
  })
  @ApiParam({
    name: 'id',
    description: 'Campo UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Campo recuperado con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'El usuario no tiene permiso para acceder a este campo.',
  })
  @ApiResponse({
    status: 404,
    description: 'Campo no encontrado.',
  })
  async findById(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    const { user } = req;
    if (user.role === Role.AGRONOMO) {
      const userDoc = await this.userRepository.findById(user.sub);
      if (!userDoc?.camposAsignados.includes(id)) {
        throw new NotFoundException(`Campo con id "${id}" no encontrado`);
      }
    }
    return this.camposService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.PRODUCTOR)
  @ApiOperation({
    summary: 'Crear campo',
    description: 'Crea un nuevo campo asociado con un productor.',
  })
  @ApiResponse({
    status: 201,
    description: 'Campo creado correctamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de campo no válidos.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores y los productores pueden crear campos.',
  })
  create(@Body() dto: CreateCampoDto) {
    return this.camposService.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Eliminar campo',
    description:
      'Elimina un campo. Esta operación está restringida a los administradores.',
  })
  @ApiParam({
    name: 'id',
    description: 'Campo UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Campo eliminado correctamente.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los administradores pueden eliminar campos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Campo no encontrado.',
  })
  delete(@Param('id') id: string) {
    return this.camposService.delete(id);
  }
}
