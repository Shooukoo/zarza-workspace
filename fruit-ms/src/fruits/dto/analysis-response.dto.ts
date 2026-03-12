import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsString,
  IsDateString,
  ValidateNested,
  IsOptional,
} from 'class-validator';

export class MetricasSaludDto {
  @IsNumber()
  total_elementos_detectados: number;

  @IsNumber()
  elementos_sanos: number;

  @IsNumber()
  elementos_enfermos: number;

  @IsNumber()
  porcentaje_merma_general: number;
}

export class ProyeccionFinancieraDto {
  @IsNumber()
  peso_sano_gramos: number;
}

export class PrediccionDto {
  @IsString()
  cambio_a: string;

  @IsNumber()
  en_dias: number;

  @IsNumber()
  dias_para_cosecha: number;
}

export class EtapaFenologicaDto {
  @IsString()
  etapa: string;

  @IsNumber()
  cantidad: number;

  @ValidateNested()
  @Type(() => PrediccionDto)
  prediccion: PrediccionDto;
}

/** DTO para la respuesta completa de fruit-inference POST /analyze */
export class AnalysisResponseDto {
  @IsString()
  image_id: string;

  @IsOptional()
  @IsString()
  variedad: string | null;

  @IsDateString()
  fecha_analisis: string;

  @ValidateNested()
  @Type(() => MetricasSaludDto)
  metricas_salud: MetricasSaludDto;

  @ValidateNested()
  @Type(() => ProyeccionFinancieraDto)
  proyeccion_financiera: ProyeccionFinancieraDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EtapaFenologicaDto)
  cronograma_fenologico: EtapaFenologicaDto[];
}
