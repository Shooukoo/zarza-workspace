import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
  IsIn,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CronogramaCorregidoItemDto {
  @ApiProperty({
    description: 'Estadio fenológico corregido.',
    example: 'Floración',
  })
  @IsString()
  @IsNotEmpty()
  etapa: string;

  @ApiProperty({
    description: 'Cantidad corregida para la etapa.',
    example: 25,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class ValidateAnalysisDto {
  @ApiProperty({
    enum: ['validado', 'rechazado'],
    description: 'Acción de validación a aplicar al análisis.',
    example: 'validado',
  })
  @IsIn(['validado', 'rechazado'])
  action: 'validado' | 'rechazado';

  @ApiPropertyOptional({
    type: () => [CronogramaCorregidoItemDto],
    description: 'Calendario fenológico corregido.',
    example: [
      {
        etapa: 'Floración',
        cantidad: 25,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CronogramaCorregidoItemDto)
  cronograma_corregido?: CronogramaCorregidoItemDto[];

  @ApiPropertyOptional({
    description: 'Observaciones realizadas durante la validación.',
    example: 'El análisis fue validado con correcciones menores.',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
