import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateEstadoDto } from './create-solicitud.dto';

describe('UpdateEstadoDto', () => {
  it.each(['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'])(
    'passes with estado=%s',
    async (estado) => {
      const dto = plainToInstance(UpdateEstadoDto, { estado });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  it('fails with an unknown estado', async () => {
    const dto = plainToInstance(UpdateEstadoDto, { estado: 'APROBADO' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'estado')).toBe(true);
  });

  // Regresión: la app enviaba el nombre del enum de Dart (camelCase) en vez
  // del valor esperado por Prisma, y el mensaje de error quedaba vacío
  // porque @IsEnum recibía un arreglo de strings en lugar del enum real.
  it('fails with the camelCase Dart enum name and lists the allowed values', async () => {
    const dto = plainToInstance(UpdateEstadoDto, { estado: 'enProgreso' });
    const errors = await validate(dto);
    const estadoError = errors.find((e) => e.property === 'estado');
    expect(estadoError).toBeDefined();
    expect(estadoError?.constraints?.isEnum).toContain('PENDIENTE');
    expect(estadoError?.constraints?.isEnum).toContain('EN_PROGRESO');
  });
});
