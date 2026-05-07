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
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';

@Controller('campos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CamposController {
  constructor(
    private readonly camposService: CamposService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO, Role.MONITOR)
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
  create(@Body() dto: CreateCampoDto) {
    return this.camposService.create(dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(@Param('id') id: string) {
    return this.camposService.delete(id);
  }
}
