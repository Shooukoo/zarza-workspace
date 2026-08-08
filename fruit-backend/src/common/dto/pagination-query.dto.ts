import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@rubus/database';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO base del contrato de paginación unificado.
 * Los DTOs de query de cada endpoint listado deben extenderlo
 * (el ValidationPipe global usa forbidNonWhitelisted, así que cada
 * endpoint debe declarar TODOS sus query params en un solo DTO).
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Page number.',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page.',
    example: 20,
    minimum: 1,
    maximum: MAX_PAGE_LIMIT,
    default: DEFAULT_PAGE_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number = DEFAULT_PAGE_LIMIT;
}
