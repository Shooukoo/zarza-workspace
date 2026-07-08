import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ESTADO_VALUES = [
  'PENDIENTE',
  'EN_PROGRESO',
  'COMPLETADO',
  'CANCELADO',
] as const;

export class ListSolicitudesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ESTADO_VALUES)
  estado?: (typeof ESTADO_VALUES)[number];

  @IsOptional()
  @IsString()
  campo_id?: string;
}
