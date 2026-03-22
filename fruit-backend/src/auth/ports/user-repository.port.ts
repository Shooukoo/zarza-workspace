import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';

export const I_USER_REPOSITORY = Symbol('I_USER_REPOSITORY');

/** Datos necesarios para crear un nuevo usuario (sin ID, que lo genera el repositorio). */
export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(data: CreateUserData): Promise<User>;
}

