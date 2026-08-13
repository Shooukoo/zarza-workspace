import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { AccionFeedback } from '@rubus/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ETAPAS_CONOCIDAS, type EtapaConocida } from './create-detection.dto';

export class DetectionFeedbackDto {
  @ApiProperty({ enum: AccionFeedback })
  @IsEnum(AccionFeedback)
  accion: AccionFeedback;

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
