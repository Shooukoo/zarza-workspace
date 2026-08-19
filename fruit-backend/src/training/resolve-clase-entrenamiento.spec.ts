import { resolveClaseParaEntrenamiento } from './resolve-clase-entrenamiento';

describe('resolveClaseParaEntrenamiento', () => {
  it('retorna "enfermo" sin importar la etapa cuando sano=false', () => {
    expect(resolveClaseParaEntrenamiento('naranja', false)).toBe('enfermo');
    expect(resolveClaseParaEntrenamiento('deteccion_gen', false)).toBe('enfermo');
  });

  it('mapea etapas conocidas 1:1 a su nombre de clase cuando sano=true', () => {
    expect(resolveClaseParaEntrenamiento('boton', true)).toBe('boton');
    expect(resolveClaseParaEntrenamiento('naranja', true)).toBe('naranja');
    expect(resolveClaseParaEntrenamiento('maduro', true)).toBe('maduro');
  });

  it('mapea deteccion_gen a zarzamora cuando sano=true', () => {
    expect(resolveClaseParaEntrenamiento('deteccion_gen', true)).toBe('zarzamora');
  });

  it('lanza un error para una etapa desconocida', () => {
    expect(() => resolveClaseParaEntrenamiento('etapa_inexistente', true)).toThrow();
  });
});
