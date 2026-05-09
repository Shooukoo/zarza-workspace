import { Injectable } from '@nestjs/common';
import { PrismaService } from '@rubus/database';
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
    return new User(doc.id, doc.email, doc.passwordHash, doc.role as Role);
  }

  async save(data: CreateUserData): Promise<User> {
    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
    return new User(created.id, created.email, created.passwordHash, created.role as Role);
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
}
