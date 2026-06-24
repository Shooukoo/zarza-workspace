import { Injectable } from '@nestjs/common';
import { PrismaService, User as PrismaUser } from '@rubus/database';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { Role } from '../../domain/enums/role.enum';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async save(data: CreateUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
      },
    });
    return new User(
      created.id,
      created.email,
      created.passwordHash,
      created.role as Role,
      created.firstName ?? null,
      created.lastName ?? null,
    );
  }

  async findById(id: string): Promise<UserCampos | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id },
      include: { camposAsignados: { select: { campoId: true } } },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      camposAsignados: doc.camposAsignados.map((uc) => uc.campoId),
    };
  }

  async findUserById(id: string): Promise<User | null> {
    const doc = await this.prisma.user.findUnique({ where: { id } });
    if (!doc) return null;
    return this.toDomain(doc);
  }

  async findFcmTokenById(userId: string): Promise<string | null> {
    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });
    return doc?.fcmToken ?? null;
  }

  async clearFcmToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }

  async saveFcmToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string },
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
      },
    });
  }

  private toDomain(doc: PrismaUser): User {
    return new User(
      doc.id,
      doc.email,
      doc.passwordHash,
      doc.role as Role,
      doc.firstName ?? null,
      doc.lastName ?? null,
    );
  }
}
