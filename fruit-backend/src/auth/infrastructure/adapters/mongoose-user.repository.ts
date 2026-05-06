import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../domain/entities/user.entity';
import { IUserRepository, CreateUserData, UserCampos } from '../../ports/user-repository.port';
import { UserDocument, UserHydratedDocument } from '../schemas/user.schema';
import { Role } from '../../domain/enums/role.enum';

/**
 * Adaptador de infraestructura que implementa IUserRepository usando Mongoose/MongoDB.
 * La capa de dominio y aplicación nunca importan este archivo directamente —
 * solo conocen IUserRepository vía inyección de dependencias.
 */
@Injectable()
export class MongooseUserRepository implements IUserRepository {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserHydratedDocument>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const doc = await this.userModel
      .findOne({ email: email.toLowerCase().trim() })
      .lean<{ _id: any; email: string; passwordHash: string; role: Role }>()
      .exec();

    if (!doc) return null;

    return new User(
      doc._id.toString(),
      doc.email,
      doc.passwordHash,
      doc.role,
    );
  }

  async save(data: CreateUserData): Promise<User> {
    const created = await this.userModel.create({
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
    });

    return new User(
      (created._id as any).toString(),
      created.email,
      created.passwordHash,
      created.role,
    );
  }

  async findById(id: string): Promise<UserCampos | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await this.userModel
      .findById(id)
      .select('campos_asignados')
      .lean<{ campos_asignados: Types.ObjectId[] }>()
      .exec();
    if (!doc) return null;
    return {
      id,
      camposAsignados: doc.campos_asignados?.map((oid) => oid.toString()) ?? [],
    };
  }
}

