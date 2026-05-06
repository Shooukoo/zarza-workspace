import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserDocument,
  UserHydratedDocument,
} from '../auth/infrastructure/schemas/user.schema';
import { AnalysisDashboardDocument } from './schemas/analysis.schema';
import { Role } from '../auth/domain/enums/role.enum';
import { I_HASHER_PORT } from '../auth/ports/hasher.port';
import type { IHasherPort } from '../auth/ports/hasher.port';
import { UserAlreadyExistsError } from '../auth/domain/errors/auth.errors';

export interface UserSummary {
  id: string;
  email: string;
  role: Role;
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
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserHydratedDocument>,
    @InjectModel(AnalysisDashboardDocument.name)
    private readonly analysisModel: Model<AnalysisDashboardDocument>,
    @Inject(I_HASHER_PORT)
    private readonly hasher: IHasherPort,
  ) {}

  async findAllUsers(
    page = 1,
    limit = 20,
    role?: Role,
  ): Promise<{ data: UserSummary[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const query = role ? { role } : {};

    const [docs, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<{ _id: any; email: string; role: Role; createdAt: Date; campos_asignados: Types.ObjectId[] }[]>()
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    const analysisCounts = await this.analysisModel
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$requester.userId', count: { $sum: 1 } } },
      ])
      .exec();
    const countMap = new Map(
      analysisCounts.map(({ _id, count }) => [_id, count]),
    );

    const data = docs.map((d) => {
      const id = d._id.toString();
      return {
        id,
        email: d.email,
        role: d.role,
        createdAt: d.createdAt,
        campos_asignados: (d.campos_asignados ?? []).map((oid) => oid.toString()),
        totalAnalyses: countMap.get(id) ?? 0,
      };
    });

    return { data, total, page, limit };
  }

  async updateUserRole(userId: string, role: Role): Promise<UserSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const doc = await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(userId), { role }, { new: true })
      .select('-passwordHash')
      .lean<{ _id: any; email: string; role: Role; createdAt: Date }>()
      .exec();

    if (!doc) throw new Error(`User ${userId} not found`);

    return {
      id: doc._id.toString(),
      email: doc.email,
      role: doc.role,
      createdAt: doc.createdAt,
      campos_asignados: [],
    };
  }

  async getStats(): Promise<AdminStats> {
    const roleCounts = await this.userModel
      .aggregate<{ _id: Role; count: number }>([
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ])
      .exec();

    const usersByRole = Object.values(Role).reduce(
      (acc, r) => ({ ...acc, [r]: 0 }),
      {} as Record<Role, number>,
    );
    for (const { _id, count } of roleCounts) {
      usersByRole[_id] = count;
    }

    return {
      totalUsers: Object.values(usersByRole).reduce((a, b) => a + b, 0),
      usersByRole,
    };
  }

  async createUser(email: string, plainPassword: string, role: Role): Promise<UserSummary> {
    if (role === Role.ADMIN) {
      throw new Error('No se puede crear usuarios con rol ADMIN');
    }

    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      throw new UserAlreadyExistsError(email);
    }

    const passwordHash = await this.hasher.hash(plainPassword);
    const created = await this.userModel.create({
      email,
      passwordHash,
      role,
    });

    return {
      id: created._id.toString(),
      email: created.email,
      role: created.role,
      createdAt: created.createdAt,
      campos_asignados: [],
      totalAnalyses: 0,
    };
  }

  async updateCampos(userId: string, camposIds: string[]): Promise<UserSummary> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const doc = await this.userModel
      .findByIdAndUpdate(
        new Types.ObjectId(userId),
        { campos_asignados: camposIds.map((id) => new Types.ObjectId(id)) },
        { new: true },
      )
      .select('-passwordHash')
      .lean<{
        _id: any;
        email: string;
        role: Role;
        createdAt: Date;
        campos_asignados: Types.ObjectId[];
      }>()
      .exec();
    if (!doc) throw new Error(`User ${userId} not found`);
    return {
      id: doc._id.toString(),
      email: doc.email,
      role: doc.role,
      createdAt: doc.createdAt,
      campos_asignados: (doc.campos_asignados ?? []).map((oid) => oid.toString()),
    };
  }

  async deleteUser(userId: string, requesterId: string): Promise<void> {
    if (userId === requesterId) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const result = await this.userModel
      .findByIdAndDelete(new Types.ObjectId(userId))
      .exec();
    if (!result) throw new Error(`User ${userId} not found`);
  }

  async updatePassword(userId: string, plainPassword: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException(`Invalid user id: ${userId}`);
    }
    const passwordHash = await this.hasher.hash(plainPassword);
    const result = await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(userId), { passwordHash })
      .exec();
    if (!result) throw new Error(`User ${userId} not found`);
  }
}
