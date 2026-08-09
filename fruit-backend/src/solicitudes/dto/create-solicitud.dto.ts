import {
  IsEnum,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsString,
} from 'class-validator';
import { EstadoSolicitud } from '@rubus/database';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSolicitudDto {
  @ApiProperty({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c929',
    description: 'UUID del campo donde se realizará el muestreo.',
  })
  @IsUUID()
  campo_id: string;

  @ApiProperty({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c930',
    description: 'UUID del monitor asignado a la solicitud de muestreo.',
  })
  @IsUUID()
  asignado_a: string;

  @ApiProperty({
    example: 'Realizar muestreo de frutos en el campo norte.',
    description: 'Mensaje o instrucciones para el monitor asignado.',
  })
  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @ApiPropertyOptional({
    example: '2026-08-15T18:00:00.000Z',
    description: 'Plazo opcional para completar la solicitud de muestreo.',
  })
  @IsOptional()
  @IsDateString()
  fecha_limite?: string;
}

export class UpdateEstadoDto {
  @ApiProperty({
    enum: EstadoSolicitud,
    example: 'EN_PROGRESO',
    description: 'Nuevo estado para la solicitud de muestreo.',
  })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;
}
