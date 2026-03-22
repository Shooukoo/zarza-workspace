import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '../../application/auth.service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
} from '../../domain/errors/auth.errors';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../domain/enums/role.enum';

// Token de inyección del AuthService instanciado a nivel de módulo (factory)
export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
  ) {}

  /**
   * Crea un nuevo usuario. Solo accesible por administradores autenticados.
   * El rol del nuevo usuario siempre será MONITOR (nivel mínimo).
   */
  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async register(@Body() registerDto: RegisterDto) {
    try {
      return await this.authService.register(
        registerDto.email,
        registerDto.password,
      );
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    try {
      return await this.authService.login(loginDto.email, loginDto.password);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }
}


