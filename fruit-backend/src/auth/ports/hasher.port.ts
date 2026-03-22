export const I_HASHER_PORT = Symbol('I_HASHER_PORT');

export interface IHasherPort {
  hash(plainText: string): Promise<string>;
  compare(plainText: string, hash: string): Promise<boolean>;
}
