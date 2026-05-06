import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Req,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FruitsQueryService } from './fruits-query.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { Role } from '../auth/domain/enums/role.enum';

@Controller('fruits')
@UseGuards(JwtAuthGuard)
export class FruitsQueryController {
  private readonly logger = new Logger(FruitsQueryController.name);

  constructor(
    private readonly fruitsQueryService: FruitsQueryService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  async findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('image_id') imageId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    const scope = await this.buildScope(req.user);
    this.logger.debug(`GET /fruits page=${page} limit=${limit} role=${scope.role}`);
    return this.fruitsQueryService.findAll({ page, limit, imageId, startDate, endDate }, scope);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const scope = await this.buildScope(req.user);
    const result = await this.fruitsQueryService.findOne(id, scope);
    if (!result) throw new NotFoundException();
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.MONITOR) {
      const user = await this.userRepository.findById(jwtUser.sub);
      return { role: jwtUser.role, sub: jwtUser.sub, camposAsignados: user?.camposAsignados ?? [] };
    }
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
