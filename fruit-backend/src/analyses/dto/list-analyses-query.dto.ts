import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ANALYSIS_ESTADO_VALUES = [
  'pendiente',
  'validado',
  'rechazado',
  'all',
] as const;

export type AnalysisEstadoFilter = (typeof ANALYSIS_ESTADO_VALUES)[number];

export class ListAnalysesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ANALYSIS_ESTADO_VALUES)
  estado: AnalysisEstadoFilter = 'pendiente';

  @IsOptional()
  @IsString()
  campo_id?: string;
}
