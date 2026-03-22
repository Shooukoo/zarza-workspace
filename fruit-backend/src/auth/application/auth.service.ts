import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';
import { IUserRepository } from '../ports/user-repository.port';
import { IHasherPort } from '../ports/hasher.port';
import { ITokenPort } from '../ports/token.port';
import {
  InvalidCredentialsError,
  UserAlreadyExistsError,
} from '../domain/errors/auth.errors';

export type RegisteredUserResult = {
  user: { id: string; email: string; role: Role };
  token: string;
};

export class AuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly hasher: IHasherPort,
    private readonly tokenService: ITokenPort,
  ) {}

  /**
   * Registra un nuevo usuario. El rol siempre se asigna como `MONITOR`
   * (nivel mínimo de acceso). La promoción de roles debe realizarse
   * mediante un endpoint de administración separado.
   */
  async register(
    email: string,
    plainPassword: string,
  ): Promise<RegisteredUserResult> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(plainPassword);

    const newUser = await this.userRepository.save({
      email,
      passwordHash,
      role: Role.MONITOR, // ← Rol mínimo por defecto; nunca viene del cliente
    });

    const token = await this.tokenService.generateToken({
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    });

    return {
      user: { id: newUser.id, email: newUser.email, role: newUser.role },
      token,
    };
  }

  async login(
    email: string,
    plainPassword: string,
  ): Promise<{ token: string; user: { id: string; email: string; role: Role } }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await this.hasher.compare(
      plainPassword,
      user.hashedPassword,
    );
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    const token = await this.tokenService.generateToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
