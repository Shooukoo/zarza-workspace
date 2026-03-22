import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FruitsQueryService } from './fruits-query.service';

/**
 * Prerequisito bloqueante #1 resuelto: expone resultados de análisis a la app Flutter.
 *
 * GET /api/fruits            → Listado paginado de análisis
 * GET /api/fruits/:id        → Un análisis específico por _id de MongoDB
 */
@Controller('fruits')
export class FruitsQueryController {
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
    console.log(`[FruitsQuery] GET /fruits | filters=`, { page, limit, imageId, userId, startDate, endDate });
    return this.fruitsQueryService.findAll(page, limit, imageId, userId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fruitsQueryService.findById(id);
  }
}
