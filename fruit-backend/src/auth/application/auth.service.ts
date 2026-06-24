import { UnauthorizedException } from '@nestjs/common';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';
import { IUserRepository } from '../ports/user-repository.port';
import { IHasherPort } from '../ports/hasher.port';
import { ITokenPort } from '../ports/token.port';
import { IRefreshTokenRepository } from '../ports/refresh-token-repository.port';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../domain/errors/auth.errors';

export type UserProfile = {
  id: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
};

export type RegisteredUserResult = {
  user: UserProfile;
  token: string;
};

export type LoginResult = {
  token: string;
  refreshToken: string;
  user: UserProfile;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasherPort,
    private readonly tokenService: ITokenPort,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly refreshExpiresMs: number,
  ) {}

  async register(
    email: string,
    plainPassword: string,
    firstName?: string,
    lastName?: string,
  ): Promise<RegisteredUserResult> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(plainPassword);

    const newUser = await this.userRepository.save({
      email,
      passwordHash,
      role: Role.MONITOR,
      firstName: firstName?.trim(),
      lastName: lastName?.trim(),
    });

    const token = await this.tokenService.generateToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: this._toProfile(newUser),
      token,
    };
  }

  async login(email: string, plainPassword: string): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new InvalidCredentialsError();

    const isPasswordValid = await this.hasher.compare(
      plainPassword,
      user.hashedPassword,
    );
    if (!isPasswordValid) throw new InvalidCredentialsError();

    const token = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = this._generateRefreshToken();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.refreshTokenRepo.create({
      tokenHash: this._hashToken(refreshToken),
      userId: user.id,
      familyId,
      expiresAt,
    });

    return { token, refreshToken, user: this._toProfile(user) };
  }

  async refresh(
    rawToken: string,
  ): Promise<{ token: string; refreshToken: string }> {
    const hash = this._hashToken(rawToken);
    const record = await this.refreshTokenRepo.findByTokenHash(hash);

    if (!record) throw new UnauthorizedException('Refresh token inválido');

    if (record.revokedAt !== null) {
      await this.refreshTokenRepo.revokeByFamilyId(record.familyId);
      throw new UnauthorizedException(
        'Refresh token reutilizado — sesión invalidada',
      );
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    await this.refreshTokenRepo.revokeByTokenHash(hash);

    const user = await this.userRepository.findUserById(record.userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const newAccessToken = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = this._generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshExpiresMs);

    await this.refreshTokenRepo.create({
      tokenHash: this._hashToken(newRefreshToken),
      userId: user.id,
      familyId: record.familyId,
      expiresAt,
    });

    return { token: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const hash = this._hashToken(rawToken);
    await this.refreshTokenRepo.revokeByTokenHash(hash);
  }

  private _generateRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private _hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private _toProfile(user: User): UserProfile {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
