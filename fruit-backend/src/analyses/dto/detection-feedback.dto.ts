import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ETAPAS_CONOCIDAS, type EtapaConocida } from './create-detection.dto';

export const ACCION_FEEDBACK_VALUES = ['EDITAR', 'ELIMINAR'] as const;
export type AccionFeedbackValue = (typeof ACCION_FEEDBACK_VALUES)[number];

export class DetectionFeedbackDto {
  @ApiProperty({ enum: ACCION_FEEDBACK_VALUES })
  @IsIn(ACCION_FEEDBACK_VALUES)
  accion: AccionFeedbackValue;

  @ApiPropertyOptional({ enum: ETAPAS_CONOCIDAS })
  @IsOptional()
  @IsIn(ETAPAS_CONOCIDAS)
  etapaCorregida?: EtapaConocida;

  @ApiPropertyOptional({ description: 'true = sano, false = enfermo' })
  @IsOptional()
  @IsBoolean()
  saludCorregida?: boolean;

  @ApiPropertyOptional({ example: [120.5, 340.2, 210.8, 430.1] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox?: [number, number, number, number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observaciones?: string;
}
