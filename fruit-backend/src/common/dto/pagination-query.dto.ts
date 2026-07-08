import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from '@rubus/database';

/**
 * DTO base del contrato de paginación unificado.
 * Los DTOs de query de cada endpoint listado deben extenderlo
 * (el ValidationPipe global usa forbidNonWhitelisted, así que cada
 * endpoint debe declarar TODOS sus query params en un solo DTO).
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit: number = DEFAULT_PAGE_LIMIT;
}
