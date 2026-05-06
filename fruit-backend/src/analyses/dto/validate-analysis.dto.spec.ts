import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ValidateAnalysisDto } from './validate-analysis.dto';

describe('ValidateAnalysisDto', () => {
  it('passes with valid data', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 5 }],
      observaciones: 'El fruto está más maduro de lo detectado',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when cronograma_corregido is empty array', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [],
      observaciones: 'Observacion',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'cronograma_corregido')).toBe(true);
  });

  it('fails when observaciones is missing', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 3 }],
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'observaciones')).toBe(true);
  });

  it('fails when observaciones is empty string', async () => {
    const dto = plainToInstance(ValidateAnalysisDto, {
      cronograma_corregido: [{ etapa: 'Madurez', cantidad: 3 }],
      observaciones: '',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'observaciones')).toBe(true);
  });
});
