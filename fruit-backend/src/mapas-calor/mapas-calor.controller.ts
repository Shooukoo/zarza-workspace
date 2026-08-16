import { Controller, Get, Param, Query, UseGuards, Req, Inject } from '@nestjs/common';
import { MapasCalorService } from './mapas-calor.service';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';
import { type UserScope } from '../auth/domain/types/user-scope.type';
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

@Controller('mapas-calor')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('MapasCalor')
@ApiBearerAuth()
@ApiCookieAuth('access_token')
export class MapasCalorController {
  constructor(
    private readonly mapasCalorService: MapasCalorService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  @Get('campos')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Vista general del mapa de calor',
    description:
      'Devuelve, por cada campo accesible con análisis geolocalizados, su polígono o centroide y los agregados de densidad/merma.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Datos recuperados con éxito.' })
  @ApiResponse({ status: 401, description: 'Se requiere autenticación.' })
  async getCamposHeatmap(
    @Req() req: { user: JwtPayload },
    @Query() query: HeatmapQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    return this.mapasCalorService.getCamposHeatmap(scope, query.from, query.to);
  }

  @Get('campos/:campoId/analisis')
  @Roles(Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO)
  @ApiOperation({
    summary: 'Análisis geolocalizados de un campo',
    description: 'Devuelve cada análisis geolocalizado de ese campo, para dibujar puntos individuales.',
  })
  @ApiParam({ name: 'campoId', type: String, description: 'UUID del campo.' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Datos recuperados con éxito.' })
  @ApiResponse({ status: 401, description: 'Se requiere autenticación.' })
  @ApiResponse({ status: 404, description: 'Campo no encontrado o sin acceso.' })
  async getAnalisisHeatmap(
    @Param('campoId') campoId: string,
    @Req() req: { user: JwtPayload },
    @Query() query: HeatmapQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    await this.mapasCalorService.assertCampoAccessible(campoId, scope);
    return this.mapasCalorService.getAnalisisHeatmap(campoId, query.from, query.to);
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
