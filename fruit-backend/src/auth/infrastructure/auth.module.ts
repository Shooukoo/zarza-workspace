import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController, AUTH_SERVICE } from './http/auth.controller';
import { AuthService } from '../application/auth.service';
import { I_USER_REPOSITORY } from '../ports/user-repository.port';
import { I_HASHER_PORT } from '../ports/hasher.port';
import { I_TOKEN_PORT } from '../ports/token.port';
import { MongooseUserRepository } from './adapters/mongoose-user.repository';
import { BcryptHasher } from './adapters/bcrypt-hasher.adapter';
import { JwtTokenService } from './adapters/jwt-token.adapter';
import { UserDocument, UserSchema } from './schemas/user.schema';

@Module({
  imports: [
    // Registra el schema de usuario en la colección "users"
    MongooseModule.forFeature([
      { name: UserDocument.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN')) as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // 1. Adapters (Infraestructura)
    {
      provide: I_USER_REPOSITORY,
      useClass: MongooseUserRepository, // ← Persistencia real en MongoDB
    },
    {
      provide: I_HASHER_PORT,
      useClass: BcryptHasher,
    },
    {
      provide: I_TOKEN_PORT,
      useClass: JwtTokenService,
    },

    // 2. Application Service (factory para que AuthService no dependa de NestJS)
    {
      provide: AUTH_SERVICE,
      useFactory: (userRepo, hasher, tokenPort) => {
        return new AuthService(userRepo, hasher, tokenPort);
      },
      inject: [I_USER_REPOSITORY, I_HASHER_PORT, I_TOKEN_PORT],
    },
  ],
  exports: [I_TOKEN_PORT, I_HASHER_PORT], // Exportar si otros módulos necesitan verificar tokens o hashear passwords
})
export class AuthModule {}

