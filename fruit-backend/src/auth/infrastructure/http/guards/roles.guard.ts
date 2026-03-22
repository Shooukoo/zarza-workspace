import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../domain/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../../domain/types/jwt-payload.type';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Ruta pública o solo requiere estar autenticado (sin rol específico)
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) {
      // Esto ocurre si @Roles() se usa sin @UseGuards(JwtAuthGuard) antes.
      // Lanzar 401 explícito en vez de denegar silenciosamente.
      throw new UnauthorizedException(
        'Authentication is required to access this resource',
      );
    }

    return requiredRoles.includes(user.role);
  }
}

