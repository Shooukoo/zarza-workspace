export const I_CRYPTO_PORT = Symbol('I_CRYPTO_PORT');

export interface ICryptoPort {
  encrypt(plainText: string): string;
  decrypt(cipherText: string): string;
}
