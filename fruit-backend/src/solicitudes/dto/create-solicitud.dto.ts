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
    description: 'UUID of the field where the sampling will be performed.',
  })
  @IsUUID()
  campo_id: string;

  @ApiProperty({
    example: '37f839ab-b831-4346-a2a5-cdd1ebf9c930',
    description: 'UUID of the monitor assigned to the sampling request.',
  })
  @IsUUID()
  asignado_a: string;

  @ApiProperty({
    example: 'Realizar muestreo de frutos en el campo norte.',
    description: 'Message or instructions for the assigned monitor.',
  })
  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @ApiPropertyOptional({
    example: '2026-08-15T18:00:00.000Z',
    description: 'Optional deadline for completing the sampling request.',
  })
  @IsOptional()
  @IsDateString()
  fecha_limite?: string;
}

export class UpdateEstadoDto {
  @ApiProperty({
    enum: EstadoSolicitud,
    example: 'EN_PROGRESO',
    description: 'New status for the sampling request.',
  })
  @IsEnum(EstadoSolicitud)
  estado: EstadoSolicitud;
}
