import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private readonly users: User[] = [];

  async findByEmail(email: string): Promise<User | null> {
    const user = this.users.find((u) => u.email === email);
    return user || null;
  }

  async save(data: CreateUserData): Promise<User> {
    const newUser = new User(
      randomUUID(),
      data.email,
      data.passwordHash,
      data.role,
      data.firstName ?? null,
      data.lastName ?? null,
    );
    this.users.push(newUser);
    return newUser;
  }

  // Stub: User entity has no campos_asignados; campo-scoping tests should use the Mongoose adapter.
  async findById(id: string): Promise<UserCampos | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    return { id, camposAsignados: [] };
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find((u) => u.id === id) ?? null;
  }

  async findFcmTokenById(userId: string): Promise<string | null> {
    const user = this.users.find((u) => u.id === userId);
    return user?.fcm_token ?? null;
  }

  async clearFcmToken(userId: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.fcm_token = null;
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    const user = this.users.find((u) => u.id === userId);
    if (user) user.fcm_token = token;
  }

  async updateProfile(
    _userId: string,
    _data: { firstName?: string; lastName?: string },
  ): Promise<void> {
    // No-op in tests — User is immutable; test state is verified through the array directly
  }
}

