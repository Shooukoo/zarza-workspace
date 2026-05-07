import {
  IsArray,
  IsOptional,
  ValidateNested,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CronogramaCorregidoItemDto {
  @IsString()
  @IsNotEmpty()
  etapa: string;

  @IsNumber()
  @Min(0)
  cantidad: number;
}

export class ValidateAnalysisDto {
  @IsEnum(['validado', 'rechazado'])
  action: 'validado' | 'rechazado';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CronogramaCorregidoItemDto)
  cronograma_corregido?: CronogramaCorregidoItemDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
