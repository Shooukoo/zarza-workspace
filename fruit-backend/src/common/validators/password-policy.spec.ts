import { isStrongPassword, MIN_LENGTH, MIN_TYPES, MIN_SCORE } from './password-policy';

describe('isStrongPassword', () => {
  it('rechaza contraseñas más cortas que el mínimo', () => {
    expect(isStrongPassword('Ab1!Ab1!')).toBe(false); // 8 chars, < MIN_LENGTH (10)
  });

  it('rechaza contraseñas que no cumplen al menos 3 de 4 tipos', () => {
    // Solo minúsculas y números (2 tipos), 12 caracteres
    expect(isStrongPassword('abcdefghij12')).toBe(false);
  });

  it('rechaza una contraseña que cumple longitud y composición pero es adivinable (score bajo)', () => {
    // 10 caracteres, 4 tipos (mayúscula, minúscula, número, símbolo) — pero es "password"
    // con sustituciones l33t obvias; zxcvbn real le da score 1.
    expect(isStrongPassword('Passw0rd!1')).toBe(false);
  });

  it('acepta una contraseña en el límite exacto de score aceptable (score 2)', () => {
    expect(isStrongPassword('aB1!aB1!aB')).toBe(true);
  });

  it('acepta una contraseña fuerte real', () => {
    expect(isStrongPassword('Tr0pic@lBerry9')).toBe(true);
  });

  it('expone las constantes de la política', () => {
    expect(MIN_LENGTH).toBe(10);
    expect(MIN_TYPES).toBe(3);
    expect(MIN_SCORE).toBe(2);
  });
});
