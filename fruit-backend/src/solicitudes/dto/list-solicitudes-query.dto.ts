import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const ESTADO_VALUES = [
  'PENDIENTE',
  'EN_PROGRESO',
  'COMPLETADO',
  'CANCELADO',
] as const;

export class ListSolicitudesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ESTADO_VALUES,
    example: 'PENDIENTE',
    description: 'Filter requests by status.',
  })
  @IsOptional()
  @IsIn(ESTADO_VALUES)
  estado?: (typeof ESTADO_VALUES)[number];

  @ApiPropertyOptional({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
    description: 'Filter requests by field UUID.',
  })
  @IsOptional()
  @IsString()
  campo_id?: string;
}
