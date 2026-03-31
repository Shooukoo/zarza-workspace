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
  @IsDateString()
  capturedAt: string;

  @IsDateString()
  processedAt: string;

  @IsNumber()
  size_bytes: number;
}

export class UploadResultDto {
  @IsString()
  image_id: string;

  @IsString()
  storage_key: string;

  @ValidateNested()
  @Type(() => UploadMetadataDto)
  metadata: UploadMetadataDto;

  @IsIn(['UPLOADED'])
  status: 'UPLOADED';

  // V2: trazabilidad geoespacial y sincronización offline
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

  /** ID del usuario autenticado que realizó el upload */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Email del usuario autenticado (snapshot) */
  @IsOptional()
  @IsString()
  userEmail?: string;
}

