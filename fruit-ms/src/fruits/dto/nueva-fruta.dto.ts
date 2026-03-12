import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
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

  @ValidateNested()
  @Type(() => NuevaFrutaMetadataDto)
  metadata: NuevaFrutaMetadataDto;

  @IsIn(['UPLOADED'])
  status: 'UPLOADED';
}
