import { validate } from 'class-validator';
import { IsStrongPassword } from './is-strong-password.validator';

class TestDto {
  @IsStrongPassword()
  password: string;
}

describe('@IsStrongPassword()', () => {
  it('no reporta errores para una contraseña fuerte', async () => {
    const dto = new TestDto();
    dto.password = 'Tr0pic@lBerry9';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('reporta un error con mensaje descriptivo para una contraseña débil', async () => {
    const dto = new TestDto();
    dto.password = 'abc123';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isStrongPassword).toContain('10 caracteres');
  });

  it('reporta un error para una contraseña que cumple composición pero tiene score bajo', async () => {
    const dto = new TestDto();
    dto.password = 'Passw0rd!1';

    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });
});
