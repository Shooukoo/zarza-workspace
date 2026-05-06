import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
import { I_USER_REPOSITORY, type IUserRepository } from '../auth/ports/user-repository.port';

@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('validado') validadoParam?: string,
  ) {
    let validado: boolean | 'all' = false;
    if (validadoParam === 'true') validado = true;
    else if (validadoParam === 'all') validado = 'all';
    else if (validadoParam !== undefined && validadoParam !== 'false') {
      throw new BadRequestException('validado must be true, false, or all');
    }
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(page, limit, validado, scope);
  }

  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id') id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(@Param('id') id: string, @Req() req: any) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    if (scope.role === Role.PRODUCTOR && analysis.productor_id?.toString() !== scope.sub) {
      throw new NotFoundException();
    }
    return analysis;
  }

  @Patch(':id/validate')
  @Roles(Role.AGRONOMO)
  validate(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    return this.analysesService.validate(id, req.user.sub, dto);
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    return { role: jwtUser.role, sub: jwtUser.sub };
  }
}
