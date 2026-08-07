import { randomBytes } from 'crypto';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';

describe('AesGcmCrypto', () => {
  const ORIGINAL_ENV = process.env.FCM_TOKEN_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = ORIGINAL_ENV;
  });

  it('encrypt() produce un valor prefijado con v1: distinto del original', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const encrypted = crypto.encrypt('token-de-prueba');

    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toBe('token-de-prueba');
  });

  it('decrypt(encrypt(x)) devuelve x', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const encrypted = crypto.encrypt('mi-token-fcm-12345');

    expect(crypto.decrypt(encrypted)).toBe('mi-token-fcm-12345');
  });

  it('decrypt() de un valor legado sin prefijo v1: lo devuelve tal cual', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    expect(crypto.decrypt('token-legado-en-texto-plano')).toBe(
      'token-legado-en-texto-plano',
    );
  });

  it('dos cifrados del mismo texto producen resultados distintos (IV aleatorio)', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
    const crypto = new AesGcmCrypto();

    const a = crypto.encrypt('mismo-texto');
    const b = crypto.encrypt('mismo-texto');

    expect(a).not.toBe(b);
  });

  it('el constructor lanza si falta FCM_TOKEN_ENCRYPTION_KEY', () => {
    delete process.env.FCM_TOKEN_ENCRYPTION_KEY;

    expect(() => new AesGcmCrypto()).toThrow('FCM_TOKEN_ENCRYPTION_KEY');
  });

  it('el constructor lanza si la clave no decodifica a 32 bytes', () => {
    process.env.FCM_TOKEN_ENCRYPTION_KEY =
      Buffer.from('muy-corta').toString('base64');

    expect(() => new AesGcmCrypto()).toThrow('32 bytes');
  });
});
