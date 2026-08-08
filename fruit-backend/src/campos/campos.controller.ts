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
export class CamposController {
  constructor(
    private readonly camposService: CamposService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
  @ApiOperation({
    summary: 'List fields',
    description:
      'Returns the fields accessible to the authenticated user. Administrators can optionally filter by producer.',
  })
  @ApiQuery({
    name: 'productor_id',
    required: false,
    description: 'Producer UUID used to filter fields.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Fields retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access fields.',
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
    summary: 'Get field by ID',
    description:
      'Returns the details of a specific field accessible to the authenticated user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Field UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Field retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access this field.',
  })
  @ApiResponse({
    status: 404,
    description: 'Field not found.',
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
    summary: 'Create field',
    description: 'Creates a new field associated with a producer.',
  })
  @ApiResponse({
    status: 201,
    description: 'Field created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid field data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators and producers can create fields.',
  })
  create(@Body() dto: CreateCampoDto) {
    return this.camposService.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete field',
    description:
      'Deletes a field. This operation is restricted to administrators.',
  })
  @ApiParam({
    name: 'id',
    description: 'Field UUID.',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Field deleted successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can delete fields.',
  })
  @ApiResponse({
    status: 404,
    description: 'Field not found.',
  })
  delete(@Param('id') id: string) {
    return this.camposService.delete(id);
  }
}
