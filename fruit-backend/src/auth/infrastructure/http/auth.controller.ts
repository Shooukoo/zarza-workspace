import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
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

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
  ) {}

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
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      reply.setCookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
      return result;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    // req.user is the JwtPayload set by JwtAuthGuard: { sub, email, role }
    return req.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }
}
