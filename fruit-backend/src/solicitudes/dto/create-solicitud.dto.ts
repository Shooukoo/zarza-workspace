import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import type { EstadoSolicitud } from '../schemas/solicitud-muestreo.schema';

export class CreateSolicitudDto {
  /** ObjectId del campo donde se debe realizar el muestreo */
  @IsMongoId()
  campo_id: string;

  /** ObjectId del Monitor / Agrónomo asignado a la tarea */
  @IsMongoId()
  asignado_a: string;

  /** Instrucciones para el trabajador de campo */
  @IsString()
  @IsNotEmpty()
  mensaje: string;

  /** Fecha límite opcional para completar el muestreo (ISO 8601) */
  @IsOptional()
  @IsDateString()
  fecha_limite?: string;
}

export class UpdateEstadoDto {
  @IsEnum(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'])
  estado: EstadoSolicitud;
}
