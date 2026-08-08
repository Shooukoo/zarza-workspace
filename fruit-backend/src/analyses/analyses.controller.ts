import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
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
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../auth/ports/user-repository.port';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ANALYSIS_ESTADO_VALUES,
  ListAnalysesQueryDto,
} from './dto/list-analyses-query.dto';

@ApiTags('Analyses')
@ApiBearerAuth()
@Controller('analyses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalysesController {
  constructor(
    private readonly analysesService: AnalysesService,
    @Inject(I_USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @ApiOperation({
    summary: 'List fruit analyses',
    description:
      'Returns a paginated list of analyses according to the authenticated user role and optional filters.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of analyses per page.',
    example: 10,
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ANALYSIS_ESTADO_VALUES,
    description: 'Filter analyses by validation status.',
    example: 'pendiente',
  })
  @ApiQuery({
    name: 'campo_id',
    required: false,
    type: String,
    description: 'Filter analyses by field ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analyses retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access analyses.',
  })
  @Get()
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findAll(
    @Req() req: { user: JwtPayload },
    @Query() query: ListAnalysesQueryDto,
  ) {
    const scope = await this.buildScope(req.user);
    return this.analysesService.findAll(
      query.page,
      query.limit,
      query.estado,
      scope,
      query.campo_id,
    );
  }

  @ApiOperation({
    summary: 'Get analysis image URL',
    description:
      'Returns a URL to access the image associated with an analysis.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Analysis UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Image URL retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access the image.',
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis not found.',
  })
  @Get(':id/image')
  @Roles(Role.ADMIN, Role.AGRONOMO)
  async getImage(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.analysesService.getImageUrl(id);
    return { url };
  }

  @ApiOperation({
    summary: 'Get an analysis',
    description: 'Returns the details of a specific fruit analysis.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Analysis UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to access this analysis.',
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis not found.',
  })
  @Get(':id')
  @Roles(Role.ADMIN, Role.AGRONOMO, Role.PRODUCTOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
  ) {
    const scope = await this.buildScope(req.user);
    const analysis = await this.analysesService.findById(id);
    if (scope.role === Role.PRODUCTOR && analysis.productorId !== scope.sub) {
      throw new NotFoundException();
    }
    if (
      scope.role === Role.AGRONOMO &&
      scope.camposAsignados?.length &&
      !scope.camposAsignados.includes(analysis.campoId ?? '')
    ) {
      throw new NotFoundException();
    }
    return analysis;
  }

  @ApiOperation({
    summary: 'Validate or reject an analysis',
    description:
      'Allows an agronomist or administrator to validate or reject a fruit analysis.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    format: 'uuid',
    description: 'Analysis UUID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis validation completed successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid validation data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required.',
  })
  @ApiResponse({
    status: 403,
    description: 'User does not have permission to validate analyses.',
  })
  @ApiResponse({
    status: 404,
    description: 'Analysis not found.',
  })
  @Patch(':id/validate')
  @Roles(Role.AGRONOMO, Role.ADMIN)
  async validate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: JwtPayload },
    @Body() dto: ValidateAnalysisDto,
  ) {
    const result = await this.analysesService.validate(id, req.user.sub, dto);
    if (result.productorId) {
      this.notificationsGateway.emitToUser(
        result.productorId,
        'analysis_validated',
        {
          analysisId: id,
          action: dto.action,
          validatedBy: req.user.email,
          productorId: result.productorId,
        },
      );
    }
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
