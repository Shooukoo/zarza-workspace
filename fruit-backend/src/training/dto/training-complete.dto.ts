import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const TRAINING_COMPLETE_STATUS = ['COMPLETED', 'FAILED'] as const;
export type TrainingCompleteStatus = (typeof TRAINING_COMPLETE_STATUS)[number];

export class TrainingCompleteDto {
  @ApiProperty()
  @IsUUID()
  jobId: string;

  @ApiProperty({ enum: TRAINING_COMPLETE_STATUS })
  @IsIn(TRAINING_COMPLETE_STATUS)
  status: TrainingCompleteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mAP?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  mAPBase?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  r2Key?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  datasetSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
