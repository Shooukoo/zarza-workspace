import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto, UpdatePasswordDto } from './admin.controller';
import { Role } from '../auth/domain/enums/role.enum';

describe('CreateUserDto', () => {
  it('rechaza una contraseña de 6 caracteres que antes pasaba (MinLength(6) legado)', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'abc123', // 6 chars, pasaba con la regla vieja @MinLength(6)
      role: Role.MONITOR,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'user@example.com',
      password: 'Tr0pic@lBerry9',
      role: Role.MONITOR,
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});

describe('UpdatePasswordDto', () => {
  it('rechaza una contraseña de 6 caracteres que antes pasaba (MinLength(6) legado)', async () => {
    const dto = plainToInstance(UpdatePasswordDto, { password: 'abc123' });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(UpdatePasswordDto, {
      password: 'Tr0pic@lBerry9',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
