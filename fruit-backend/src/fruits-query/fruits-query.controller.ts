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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Fruits')
@ApiBearerAuth()
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
    summary: 'List fruits',
    description:
      'Returns a paginated list of fruits accessible to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fruits retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
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
    summary: 'Get fruit by ID',
    description:
      'Returns a specific fruit accessible to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fruit retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 404,
    description: 'Fruit not found.',
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
