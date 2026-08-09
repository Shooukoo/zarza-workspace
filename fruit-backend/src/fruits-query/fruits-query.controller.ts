import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FruitsQueryService } from './fruits-query.service';
import { GetFruitsQueryDto } from './dto/get-fruits-query.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';
import { AppLogger } from '../common/logging/app.logger';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Fruits')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
@Controller('fruits')
@UseGuards(JwtAuthGuard)
export class FruitsQueryController {
  constructor(
    private readonly fruitsQueryService: FruitsQueryService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly logger: AppLogger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar frutas',
    description:
      'Devuelve una lista paginada de frutas accesibles para el usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Frutas recuperadas con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  async findAll(@Req() req: any, @Query() query: GetFruitsQueryDto) {
    const scope = await this.buildScope(req.user);
    this.logger.debug('GET /fruits', {
      page: query.page,
      limit: query.limit,
      role: scope.role,
    });
    return this.fruitsQueryService.findAll(
      {
        page: query.page,
        limit: query.limit,
        imageId: query.image_id,
        userId: query.user_id,
        startDate: query.start_date,
        endDate: query.end_date,
      },
      scope,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtener fruta por ID',
    description:
      'Devuelve una fruta específica accesible para el usuario autenticado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fruta recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'Se requiere autenticación.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fruta no encontrada.',
  })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const scope = await this.buildScope(req.user);
    const result = await this.fruitsQueryService.findOne(id, scope);
    if (!result) throw new NotFoundException();
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.MONITOR) {
      const user = await this.userRepository.findById(jwtUser.sub);
      return {
        role: jwtUser.role,
        sub: jwtUser.sub,
        camposAsignados: user?.camposAsignados ?? [],
      };
    }
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
