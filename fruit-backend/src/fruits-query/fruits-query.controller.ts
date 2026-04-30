import {
  Controller,
  Get,
  Logger,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import { FruitsQueryService } from './fruits-query.service';
import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwt-auth.guard';

@Controller('fruits')
@UseGuards(JwtAuthGuard)
export class FruitsQueryController {
  private readonly logger = new Logger(FruitsQueryController.name);

  constructor(private readonly fruitsQueryService: FruitsQueryService) {}

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('image_id') imageId?: string,
    @Query('user_id') userId?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    this.logger.debug(`GET /fruits page=${page} limit=${limit}`);
    return this.fruitsQueryService.findAll(page, limit, imageId, userId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fruitsQueryService.findById(id);
  }
}
