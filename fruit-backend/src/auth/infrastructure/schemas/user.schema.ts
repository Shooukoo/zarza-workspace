import { Schema as MongooseSchema, SchemaTypes, Types, HydratedDocument } from 'mongoose';
import { Role } from '../../domain/enums/role.enum';

/**
 * Schema puro de Mongoose para el documento de usuario.
 * Sin decoradores de NestJS para mantener la infraestructura aislada del framework.
 * La colección se llamará "users".
 */
export const UserSchema = new MongooseSchema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      required: true,
      default: Role.MONITOR,
    },
    campos_asignados: {
      type: [{ type: SchemaTypes.ObjectId, ref: 'Campo' }],
      default: [],
    },
    fcm_token: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt automáticos
    collection: 'users',
  },
);

/** Token de clase vacío — necesario para que MongooseModule.forFeature() funcione. */
export class UserDocument {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  campos_asignados: Types.ObjectId[];
  fcm_token: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Tipo del documento Mongoose hidratado (con métodos como .save(), .toObject(), etc.) */
export type UserHydratedDocument = HydratedDocument<UserDocument>;

