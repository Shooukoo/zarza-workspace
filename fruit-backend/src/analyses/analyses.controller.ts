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
} from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { ValidateAnalysisDto } from './dto/validate-analysis.dto';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/infrastructure/http/guards/roles.guard';
import { Roles } from '../auth/infrastructure/http/decorators/roles.decorator';
import { Role } from '../auth/domain/enums/role.enum';
import { type JwtPayload } from '../auth/domain/types/jwt-payload.type';

/**
 * GET    /api/analyses              → Listar análisis paginados (ADMIN, AGRONOMO)
 * GET    /api/analyses/:id/image    → Presigned URL de la imagen (ADMIN, AGRONOMO)
 * GET    /api/analyses/:id          → Detalle de un análisis (ADMIN, AGRONOMO)
 * PATCH  /api/analyses/:id/validate → Guardar corrección (AGRONOMO)
 */
@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(private readonly analysesService: AnalysesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO)
  findAll(
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
    return this.analysesService.findAll(page, limit, validado);
  }

  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id') id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  findOne(@Param('id') id: string) {
    return this.analysesService.findById(id);
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
}
