import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData } from '../../ports/user-repository.port';
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
    );
    this.users.push(newUser);
    return newUser;
  }
}

