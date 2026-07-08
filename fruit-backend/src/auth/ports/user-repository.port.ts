import { User } from '../domain/entities/user.entity';
import { Role } from '../domain/enums/role.enum';

export const I_USER_REPOSITORY = Symbol('I_USER_REPOSITORY');

export type CreateUserData = {
  email: string;
  passwordHash: string;
  role: Role;
  firstName?: string;
  lastName?: string;
};

export type UserCampos = {
  id: string;
  camposAsignados: string[];
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  save(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<UserCampos | null>;
  findUserById(id: string): Promise<User | null>;
  findFcmTokenById(userId: string): Promise<string | null>;
  clearFcmToken(userId: string): Promise<void>;
  saveFcmToken(userId: string, token: string): Promise<void>;
  updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ): Promise<void>;
}
