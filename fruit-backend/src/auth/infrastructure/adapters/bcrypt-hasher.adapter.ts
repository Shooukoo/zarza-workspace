import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IHasherPort } from '../../ports/hasher.port';

@Injectable()
export class BcryptHasher implements IHasherPort {
  private readonly rounds = 10;

  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.rounds);
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
