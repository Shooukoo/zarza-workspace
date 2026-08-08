import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User first name',
    example: 'Juan',
    required: false,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Pérez',
    required: false,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;
}
