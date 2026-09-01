import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../../common/validators/is-strong-password.validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Dirección de correo electrónico del usuario',
    example: 'usuario@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    description:
      'Contraseña de usuario. Mínimo 10 caracteres, al menos 3 de: ' +
      'mayúscula, minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @IsStrongPassword()
  password!: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    required: false,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
    required: false,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;
}
