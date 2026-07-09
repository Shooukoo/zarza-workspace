import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ICryptoPort } from '../../ports/crypto.port';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const VERSION_PREFIX = 'v1';

@Injectable()
export class AesGcmCrypto implements ICryptoPort {
  private readonly key: Buffer;

  constructor() {
    const b64 = process.env.FCM_TOKEN_ENCRYPTION_KEY;
    if (!b64) {
      throw new Error('FCM_TOKEN_ENCRYPTION_KEY env var is required');
    }
    this.key = Buffer.from(b64, 'base64');
    if (this.key.length !== 32) {
      throw new Error('FCM_TOKEN_ENCRYPTION_KEY must decode to 32 bytes');
    }
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return [
      VERSION_PREFIX,
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 4 || parts[0] !== VERSION_PREFIX) {
      // Valor legado (texto plano de antes del cifrado) — se devuelve tal cual.
      return cipherText;
    }
    const [, ivB64, authTagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]);
    return plain.toString('utf8');
  }
}
