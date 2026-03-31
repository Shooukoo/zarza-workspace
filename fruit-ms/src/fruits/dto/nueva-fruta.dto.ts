import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class NuevaFrutaMetadataDto {
  @IsDateString()
  capturedAt: string;

  @IsDateString()
  processedAt: string;

  @IsNumber()
  size_bytes: number;
}

/** DTO para el payload del evento RMQ "nueva_fruta" */
export class NuevaFrutaDto {
  @IsString()
  image_id: string;

  @IsString()
  storage_key: string;

  /** ID del usuario autenticado en fruit-backend que inició el análisis. */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Email del usuario al momento del análisis (snapshot para trazabilidad). */
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ValidateNested()
  @Type(() => NuevaFrutaMetadataDto)
  metadata: NuevaFrutaMetadataDto;

  @IsIn(['UPLOADED'])
  status: 'UPLOADED';

  // V2 metadata
  @IsOptional()
  @IsString()
  campoId?: string | null;

  @IsOptional()
  @IsString()
  productorId?: string | null;

  @IsOptional()
  @IsNumber()
  gpsLat?: number | null;

  @IsOptional()
  @IsNumber()
  gpsLon?: number | null;

  @IsOptional()
  @IsString()
  offlineSyncId?: string | null;
}


