import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto';

describe('RegisterDto', () => {
  it('rechaza una contraseña de 8 caracteres que antes pasaba (MinLength(8) legado)', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'user@example.com',
      password: 'abcdefg1', // 8 chars, pasaba con la regla vieja @MinLength(8)
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('acepta una contraseña que cumple la nueva política', async () => {
    const dto = plainToInstance(RegisterDto, {
      email: 'user@example.com',
      password: 'Tr0pic@lBerry9',
    });

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'password')).toBe(false);
  });
});
