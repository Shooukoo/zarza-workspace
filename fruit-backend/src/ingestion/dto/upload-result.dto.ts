import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UploadMetadataDto {
  @ApiProperty({
    description: 'Fecha y hora en que se capturó la imagen.',
    example: '2026-08-07T15:30:00.000Z',
  })
  @IsDateString()
  capturedAt: string;

  @ApiProperty({
    description: 'Fecha y hora en que se procesó la imagen.',
    example: '2026-08-07T15:30:05.000Z',
  })
  @IsDateString()
  processedAt: string;

  @ApiProperty({
    description: 'Tamaño de la imagen cargada en bytes.',
    example: 245678,
  })
  @IsNumber()
  size_bytes: number;
}

export class UploadResultDto {
  @ApiProperty({
    description: 'Identificador único de la imagen cargada.',
    example: 'IMG_20260807_153000.jpg',
  })
  @IsString()
  image_id: string;

  @ApiProperty({
    description: 'Clave de almacenamiento asignada a la imagen cargada.',
    example: 'uploads/IMG_20260807_153000.jpg',
  })
  @IsString()
  storage_key: string;

  @ApiProperty({
    description: 'Metadatos asociados a la imagen cargada.',
    type: UploadMetadataDto,
  })
  @ValidateNested()
  @Type(() => UploadMetadataDto)
  metadata: UploadMetadataDto;

  @ApiProperty({
    description: 'Estado de la carga.',
    example: 'UPLOADED',
    enum: ['UPLOADED'],
  })
  @IsIn(['UPLOADED'])
  status: 'UPLOADED';

  @ApiProperty({
    description: 'ID del campo donde se capturó la imagen.',
    example: 'campo-123',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  campoId?: string | null;

  @ApiProperty({
    description: 'ID del productor asociado a la imagen.',
    example: 'productor-456',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  productorId?: string | null;

  @ApiProperty({
    description: 'Latitud donde se capturó la imagen.',
    example: 19.7023,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gpsLat?: number | null;

  @ApiProperty({
    description: 'Longitud donde se capturó la imagen.',
    example: -103.3472,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gpsLon?: number | null;

  @ApiProperty({
    description: 'Identificador utilizado para correlacionar una sincronización sin conexión.',
    example: 'offline-sync-789',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  offlineSyncId?: string | null;

  @ApiProperty({
    description: 'ID del usuario autenticado que subió la imagen.',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Correo electrónico del usuario autenticado que subió la imagen.',
    example: 'usuario@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  userEmail?: string;
}
