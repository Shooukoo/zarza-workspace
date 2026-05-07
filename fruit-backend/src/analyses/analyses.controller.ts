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
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('estado') estadoParam?: string,
  ) {
    let estado: 'pendiente' | 'validado' | 'rechazado' | 'all' = 'pendiente';
    if (estadoParam === 'validado') estado = 'validado';
    else if (estadoParam === 'rechazado') estado = 'rechazado';
    else if (estadoParam === 'all') estado = 'all';
    else if (estadoParam !== undefined && estadoParam !== 'pendiente') {
      throw new BadRequestException('estado must be pendiente, validado, rechazado, or all');
    }
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(page, limit, estado, scope);
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
  @Roles(Role.AGRONOMO, Role.ADMIN)
  async validate(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    const result = await this.analysesService.validate(id, req.user.sub, dto);
    this.notificationsGateway.broadcast('analysis_validated', {
      analysisId: id,
      action: dto.action,
      validatedBy: req.user.email,
      productorId: result.productor_id?.toString(),
    });
    return result;
  }

  private async buildScope(jwtUser: JwtPayload): Promise<UserScope> {
    if (jwtUser.role === Role.AGRONOMO) {
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
