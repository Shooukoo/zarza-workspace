import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';
import { IUserRepository } from '../ports/user-repository.port';
import { IHasherPort } from '../ports/hasher.port';
import { ITokenPort } from '../ports/token.port';
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

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasherPort,
    private readonly tokenService: ITokenPort,
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

  async login(
    email: string,
    plainPassword: string,
  ): Promise<{ token: string; user: UserProfile }> {
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

    return { token, user: this._toProfile(user) };
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
