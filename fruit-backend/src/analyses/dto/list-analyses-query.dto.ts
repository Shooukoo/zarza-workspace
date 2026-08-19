import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export const ANALYSIS_ESTADO_VALUES = [
  'pendiente',
  'validado',
  'rechazado',
  'all',
] as const;

export type AnalysisEstadoFilter = (typeof ANALYSIS_ESTADO_VALUES)[number];

export const REVISION_DETECCIONES_VALUES = [
  'pendiente',
  'revisado',
  'all',
] as const;

export type RevisionDeteccionesFilter =
  (typeof REVISION_DETECCIONES_VALUES)[number];

export class ListAnalysesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ANALYSIS_ESTADO_VALUES,
    default: 'pendiente',
    description: 'Filtrar los análisis por estado de validación.',
    example: 'pendiente',
  })
  @IsOptional()
  @IsIn(ANALYSIS_ESTADO_VALUES)
  estado: AnalysisEstadoFilter = 'pendiente';

  @ApiPropertyOptional({
    description: 'ID del campo por el que filtrar los análisis.',
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
  })
  @IsOptional()
  @IsString()
  campo_id?: string;

  @ApiPropertyOptional({
    enum: REVISION_DETECCIONES_VALUES,
    description: 'Filtrar por estado de revisión de detecciones.',
  })
  @IsOptional()
  @IsIn(REVISION_DETECCIONES_VALUES)
  revision_detecciones?: RevisionDeteccionesFilter;
}
