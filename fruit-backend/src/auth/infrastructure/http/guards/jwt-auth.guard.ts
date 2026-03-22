import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import type { ITokenPort } from '../../../ports/token.port';
import { FastifyRequest } from 'fastify';
import { I_TOKEN_PORT } from '../../../ports/token.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(I_TOKEN_PORT) private readonly tokenService: ITokenPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest & { user?: any }>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.tokenService.verifyToken(token);
      // Asignamos el payload al request para que los siguientes guards o el controller lo usen
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
