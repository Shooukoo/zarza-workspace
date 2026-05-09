import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController, AUTH_SERVICE } from './http/auth.controller';
import { AuthService } from '../application/auth.service';
import { I_USER_REPOSITORY } from '../ports/user-repository.port';
import { I_HASHER_PORT } from '../ports/hasher.port';
import { I_TOKEN_PORT } from '../ports/token.port';
import { PrismaUserRepository } from './adapters/prisma-user.repository';
import { BcryptHasher } from './adapters/bcrypt-hasher.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: I_USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: I_HASHER_PORT, useClass: BcryptHasher },
    { provide: I_TOKEN_PORT, useClass: JwtTokenService },
    {
      provide: AUTH_SERVICE,
      useFactory: (userRepo, hasher, tokenPort) => new AuthService(userRepo, hasher, tokenPort),
      inject: [I_USER_REPOSITORY, I_HASHER_PORT, I_TOKEN_PORT],
    },
  ],
  exports: [I_TOKEN_PORT, I_HASHER_PORT, I_USER_REPOSITORY],
})
export class AuthModule {}

