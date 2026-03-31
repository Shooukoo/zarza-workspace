import { Schema as MongooseSchema, SchemaTypes, Types, HydratedDocument } from 'mongoose';

/**
 * Schema para representar un campo/parcela de zarzamoras.
 * Colección: "campos"
 */
export const CampoSchema = new MongooseSchema(
  {
    codigo_campo: {
      type: String,
      required: true,
      trim: true,
    },
    nombre: {
      type: String,
      required: true,
      trim: true,
    },
    productor_id: {
      type: SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    poligono_gps: {
      type: [[Number]],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: 'campos',
  },
);

/** Token de clase para MongooseModule.forFeature */
export class Campo {}

export class CampoDocument {
  _id: Types.ObjectId;
  codigo_campo: string;
  nombre: string;
  productor_id: Types.ObjectId;
  poligono_gps: number[][];
  createdAt: Date;
  updatedAt: Date;
}

export type CampoHydratedDocument = HydratedDocument<CampoDocument>;
