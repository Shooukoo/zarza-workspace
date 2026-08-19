import {
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const ETAPAS_CONOCIDAS = [
  'boton',
  'flor',
  'verde',
  'naranja',
  'marron',
  'maduro',
  'deteccion_gen',
] as const;

export type EtapaConocida = (typeof ETAPAS_CONOCIDAS)[number];

export class CreateDetectionDto {
  @ApiProperty({ enum: ETAPAS_CONOCIDAS, example: 'naranja' })
  @IsIn(ETAPAS_CONOCIDAS)
  etapa: EtapaConocida;

  @ApiProperty({ example: true, description: 'true = sano, false = enfermo' })
  @IsBoolean()
  sano: boolean;

  @ApiProperty({
    example: [120.5, 340.2, 210.8, 430.1],
    description:
      'Bounding box [x1, y1, x2, y2] en píxeles de la imagen original.',
  })
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsNumber({}, { each: true })
  bbox: [number, number, number, number];
}
