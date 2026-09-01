import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../../../common/validators/is-strong-password.validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario, para verificar identidad.',
    example: 'MiContraseñaActual1!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description:
      'Nueva contraseña. Mínimo 10 caracteres, al menos 3 de: mayúscula, ' +
      'minúscula, número, símbolo, y no debe ser fácil de adivinar.',
    example: 'Tr0pic@lBerry9',
    minLength: 10,
  })
  @IsStrongPassword()
  newPassword!: string;
}
