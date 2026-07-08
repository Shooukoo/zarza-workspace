import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  PrismaService,
  Role as PrismaRole,
  clampPagination,
  buildPaginated,
  type Paginated,
} from '@rubus/database';
import { Role } from '../auth/domain/enums/role.enum';
import { I_HASHER_PORT } from '../auth/ports/hasher.port';
import type { IHasherPort } from '../auth/ports/hasher.port';
import { UserAlreadyExistsError } from '../auth/domain/errors/auth.errors';

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  campos_asignados: string[];
  createdAt: Date;
  totalAnalyses?: number;
}

export interface AdminStats {
  totalUsers: number;
  usersByRole: Record<Role, number>;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(I_HASHER_PORT) private readonly hasher: IHasherPort,
  ) {}

  async findAllUsers(
    pageParam = 1,
    limitParam = 20,
    role?: Role,
  ): Promise<Paginated<UserSummary>> {
    const { page, limit, skip, take } = clampPagination(pageParam, limitParam);
    const where = role ? { role: role as PrismaRole } : {};

    const [docs, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          camposAsignados: { select: { campoId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    const analysisCounts = await this.prisma.analysis.groupBy({
      by: ['requesterUserId'],
      _count: { id: true },
    });
    const countMap = new Map(
      analysisCounts.map((r) => [r.requesterUserId, r._count.id]),
    );

    const data: UserSummary[] = docs.map((d) => ({
      id: d.id,
      email: d.email,
      role: d.role as Role,
      firstName: d.firstName,
      lastName: d.lastName,
      createdAt: d.createdAt,
      campos_asignados: d.camposAsignados.map((uc) => uc.campoId),
      totalAnalyses: countMap.get(d.id) ?? 0,
    }));

    return buildPaginated(data, total, page, limit);
  }

  async updateUserRole(userId: string, role: Role): Promise<UserSummary> {
    const doc = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return {
      id: doc.id,
      email: doc.email,
      role: doc.role as Role,
      createdAt: doc.createdAt,
      campos_asignados: [],
    };
  }

  async getStats(): Promise<AdminStats> {
    const roleCounts = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { id: true },
    });
    const usersByRole = Object.values(Role).reduce(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {} as Record<Role, number>,
    );
    for (const { role, _count } of roleCounts) {
      usersByRole[role as Role] = _count.id;
    }
    return {
      totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      usersByRole,
    };
  }

  async createUser(
    email: string,
    plainPassword: string,
    role: Role,
    firstName?: string,
    lastName?: string,
  ): Promise<UserSummary> {
    if (role === Role.ADMIN)
      throw new Error('No se puede crear usuarios con rol ADMIN');
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) throw new UserAlreadyExistsError(normalizedEmail);
    const passwordHash = await this.hasher.hash(plainPassword);
    const created = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        role: role,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
      },
    });
    return {
      id: created.id,
      email: created.email,
      role: created.role as Role,
      firstName: created.firstName,
      lastName: created.lastName,
      createdAt: created.createdAt,
      campos_asignados: [],
      totalAnalyses: 0,
    };
  }

  async updateName(
    userId: string,
    firstName?: string,
    lastName?: string,
  ): Promise<UserSummary> {
    const doc = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName?.trim() ?? undefined,
        lastName: lastName?.trim() ?? undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });
    return {
      id: doc.id,
      email: doc.email,
      role: doc.role as Role,
      firstName: doc.firstName,
      lastName: doc.lastName,
      createdAt: doc.createdAt,
      campos_asignados: [],
    };
  }

  async updateCampos(
    userId: string,
    camposIds: string[],
  ): Promise<UserSummary> {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) throw new BadRequestException(`User ${userId} not found`);

    await this.prisma.$transaction([
      this.prisma.userCampo.deleteMany({ where: { userId } }),
      this.prisma.userCampo.createMany({
        data: camposIds.map((campoId) => ({ userId, campoId })),
      }),
    ]);

    const doc = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return {
      id: doc!.id,
      email: doc!.email,
      role: doc!.role as Role,
      createdAt: doc!.createdAt,
      campos_asignados: camposIds,
    };
  }

  async deleteUser(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId)
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async updatePassword(userId: string, plainPassword: string): Promise<void> {
    const passwordHash = await this.hasher.hash(plainPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }
}
