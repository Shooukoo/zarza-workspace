import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidateAnalysisDto } from './validate-analysis.dto';

describe('ValidateAnalysisDto', () => {
  it('passes with action=validado and no optional fields', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, { action: 'validado' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes with action=rechazado and cronograma + observaciones', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      action: 'rechazado',
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 5 }],
      observaciones: 'El fruto está más maduro de lo detectado',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when action is missing', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 5 }],
      observaciones: 'Observación',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'action')).toBe(true);
  });

  it('fails when action is invalid value', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, { action: 'aprobado' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'action')).toBe(true);
  });

  it('fails when cronograma_corregido contains invalid item', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      action: 'rechazado',
      cronograma_corregido: [{ etapa: '', cantidad: -1 }],
    });
    const errors = await validate(dto, { skipMissingProperties: false });
    const nestedErrors = errors.find(
      (e) => e.property === 'cronograma_corregido',
    );
    expect(nestedErrors?.children?.length).toBeGreaterThan(0);
  });
});
