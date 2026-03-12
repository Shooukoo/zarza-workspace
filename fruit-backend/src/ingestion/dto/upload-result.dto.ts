import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
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
}
