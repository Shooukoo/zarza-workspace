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
    description: 'Date and time when the image was captured.',
    example: '2026-08-07T15:30:00.000Z',
  })
  @IsDateString()
  capturedAt: string;

  @ApiProperty({
    description: 'Date and time when the image was processed.',
    example: '2026-08-07T15:30:05.000Z',
  })
  @IsDateString()
  processedAt: string;

  @ApiProperty({
    description: 'Uploaded image size in bytes.',
    example: 245678,
  })
  @IsNumber()
  size_bytes: number;
}

export class UploadResultDto {
  @ApiProperty({
    description: 'Unique identifier of the uploaded image.',
    example: 'IMG_20260807_153000.jpg',
  })
  @IsString()
  image_id: string;

  @ApiProperty({
    description: 'Storage key assigned to the uploaded image.',
    example: 'uploads/IMG_20260807_153000.jpg',
  })
  @IsString()
  storage_key: string;

  @ApiProperty({
    description: 'Metadata associated with the uploaded image.',
    type: UploadMetadataDto,
  })
  @ValidateNested()
  @Type(() => UploadMetadataDto)
  metadata: UploadMetadataDto;

  @ApiProperty({
    description: 'Upload status.',
    example: 'UPLOADED',
    enum: ['UPLOADED'],
  })
  @IsIn(['UPLOADED'])
  status: 'UPLOADED';

  @ApiProperty({
    description: 'ID of the field where the image was captured.',
    example: 'campo-123',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  campoId?: string | null;

  @ApiProperty({
    description: 'ID of the producer associated with the image.',
    example: 'productor-456',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  productorId?: string | null;

  @ApiProperty({
    description: 'Latitude where the image was captured.',
    example: 19.7023,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gpsLat?: number | null;

  @ApiProperty({
    description: 'Longitude where the image was captured.',
    example: -103.3472,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  gpsLon?: number | null;

  @ApiProperty({
    description: 'Identifier used to correlate an offline synchronization.',
    example: 'offline-sync-789',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  offlineSyncId?: string | null;

  @ApiProperty({
    description: 'ID of the authenticated user who uploaded the image.',
    example: 'user-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Email of the authenticated user who uploaded the image.',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  userEmail?: string;
}
