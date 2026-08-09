import {
  Controller,
  Post,
  Patch,
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
import { Throttle } from '@nestjs/throttler';
import { IsString, MaxLength, IsNotEmpty, IsOptional } from 'class-validator';
import type { FastifyReply } from 'fastify';
import { AuthService } from '../../application/auth.service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
} from '../../domain/errors/auth.errors';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../domain/enums/role.enum';
import {
  I_USER_REPOSITORY,
  type IUserRepository,
} from '../../ports/user-repository.port';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

const COOKIE_NAME = 'access_token';
const ACCESS_COOKIE_MAX_AGE = 900; // 15 minutos

class FcmTokenDto {
  @ApiProperty({
    description: 'Token de dispositivo de Firebase Cloud Messaging',
    maxLength: 512,
  })
  @IsString()
  @MaxLength(512)
  token: string;
}

class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de actualización utilizado para obtener un nuevo token de acceso.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class LogoutDto {
  @ApiProperty({
    description: 'Token de actualización a invalidar',
    required: false,
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
    @Inject(I_USER_REPOSITORY) private readonly userRepository: IUserRepository,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description: 'Crea una nueva cuenta de usuario. Requiere privilegios de administrador.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario registrado con éxito.',
  })
  async register(@Body() dto: RegisterDto) {
    try {
      return await this.authService.register(
        dto.email,
        dto.password,
        dto.firstName,
        dto.lastName,
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
  @Throttle({ auth: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Log in',
    description: 'Autentica a un usuario y devuelve tokens de acceso y de actualización.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuario autenticado con éxito.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Correo electrónico o contraseña no válidos.',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      this.setAccessTokenCookie(reply, result.token);
      return result; // { token, refreshToken, user }
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Actualizar token de acceso',
    description: 'Genera un nuevo token de acceso utilizando un token de actualización.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token de acceso renovado correctamente.',
  })
  async refresh(
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.refresh(body.refreshToken);
    this.setAccessTokenCookie(reply, result.token);
    return result; // { token, refreshToken }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Obtener el usuario actual',
    description: 'Devuelve el usuario autenticado.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Información del usuario autenticado.',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Se requiere autenticación.',
  })
  me(@Req() req: any) {
    return req.user;
  }

  @Patch('profile')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Actualizar perfil',
    description: 'Actualiza el perfil del usuario autenticado.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Perfil actualizado correctamente.',
  })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    await this.userRepository.updateProfile(req.user.sub, {
      firstName: dto.firstName,
      lastName: dto.lastName,
    });
  }

  @Patch('fcm-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiOperation({
    summary: 'Registrar token de FCM',
    description:
      'Asocia un token de Firebase Cloud Messaging con el usuario autenticado.',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Token FCM registrado correctamente.',
  })
  async registerFcmToken(@Req() req: any, @Body() body: FcmTokenDto) {
    await this.userRepository.saveFcmToken(req.user.sub, body.token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log out',
    description:
      'Invalida el token de actualización y elimina la cookie del token de acceso.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El usuario ha cerrado sesión correctamente.',
  })
  async logout(
    @Body() body: LogoutDto,
    @Req() req: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(body?.refreshToken);
    if (req.user?.sub) {
      await this.userRepository.clearFcmToken(req.user.sub).catch(() => {});
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }

  private setAccessTokenCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
  }
}
