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
    description: 'Corrected phenological stage.',
    example: 'Floración',
  })
  @IsString()
  @IsNotEmpty()
  etapa: string;

  @ApiProperty({
    description: 'Corrected quantity for the stage.',
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
    description: 'Validation action to apply to the analysis.',
    example: 'validado',
  })
  @IsIn(['validado', 'rechazado'])
  action: 'validado' | 'rechazado';

  @ApiPropertyOptional({
    type: () => [CronogramaCorregidoItemDto],
    description: 'Corrected phenological schedule.',
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
    description: 'Observations made during validation.',
    example: 'The analysis was validated with minor corrections.',
  })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
