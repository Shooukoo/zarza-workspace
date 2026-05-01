import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { ITokenPort } from '../../../ports/token.port';
import { FastifyRequest } from 'fastify';
import { I_TOKEN_PORT } from '../../../ports/token.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(I_TOKEN_PORT) private readonly tokenService: ITokenPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: any; cookies?: Record<string, string> }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.tokenService.verifyToken(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractToken(
    request: FastifyRequest & { cookies?: Record<string, string> },
  ): string | undefined {
    const fromHeader = this.extractTokenFromHeader(request);
    if (fromHeader) return fromHeader;
    return request.cookies?.access_token;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
