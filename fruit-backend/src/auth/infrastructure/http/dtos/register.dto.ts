import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description: 'User password',
    example: 'password123',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

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
