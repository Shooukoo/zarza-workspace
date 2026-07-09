import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import ms from 'ms';
import { AuthController, AUTH_SERVICE } from './http/auth.controller';
import { AuthService } from '../application/auth.service';
import { I_USER_REPOSITORY } from '../ports/user-repository.port';
import { I_HASHER_PORT } from '../ports/hasher.port';
import { I_TOKEN_PORT } from '../ports/token.port';
import { I_REFRESH_TOKEN_REPOSITORY } from '../ports/refresh-token-repository.port';
import { I_CRYPTO_PORT } from '../ports/crypto.port';
import { PrismaUserRepository } from './adapters/prisma-user.repository';
import { BcryptHasher } from './adapters/bcrypt-hasher.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';
import { PrismaRefreshTokenRepository } from './adapters/prisma-refresh-token.repository';
import { AesGcmCrypto } from './adapters/aes-gcm-crypto.adapter';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) as ms.StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: I_USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: I_HASHER_PORT, useClass: BcryptHasher },
    { provide: I_TOKEN_PORT, useClass: JwtTokenService },
    { provide: I_CRYPTO_PORT, useClass: AesGcmCrypto },
    {
      provide: I_REFRESH_TOKEN_REPOSITORY,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: AUTH_SERVICE,
      useFactory: (
        userRepo,
        hasher,
        tokenPort,
        refreshTokenRepo,
        configService: ConfigService,
      ) => {
        const rawExpiry =
          (configService.get<string>(
            'JWT_REFRESH_EXPIRES_IN',
          ) as ms.StringValue) ?? '7d';
        return new AuthService(
          userRepo,
          hasher,
          tokenPort,
          refreshTokenRepo,
          ms(rawExpiry),
        );
      },
      inject: [
        I_USER_REPOSITORY,
        I_HASHER_PORT,
        I_TOKEN_PORT,
        I_REFRESH_TOKEN_REPOSITORY,
        ConfigService,
      ],
    },
  ],
  exports: [I_TOKEN_PORT, I_HASHER_PORT, I_USER_REPOSITORY],
})
export class AuthModule {}
