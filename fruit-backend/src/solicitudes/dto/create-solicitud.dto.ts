import {
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import type { EstadoSolicitud } from '@rubus/database';

export class CreateSolicitudDto {
  @IsUUID()
  campo_id: string;

  @IsUUID()
  asignado_a: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsOptional()
  @IsDateString()
  fecha_limite?: string;
}

export class UpdateEstadoDto {
  @IsEnum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'])
  estado: EstadoSolicitud;
}
