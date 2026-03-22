import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenPort } from '../../ports/token.port';
import { JwtPayload } from '../../domain/types/jwt-payload.type';

@Injectable()
export class JwtTokenService implements ITokenPort {
  constructor(private readonly jwtService: JwtService) {}

  async generateToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
