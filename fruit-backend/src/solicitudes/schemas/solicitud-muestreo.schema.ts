import { Schema as MongooseSchema, SchemaTypes, Types, HydratedDocument } from 'mongoose';

/**
 * Schema para solicitudes de muestreo asignadas por un ADMIN a un MONITOR/AGRONOMO.
 * Colección: "solicitudes_muestreo"
 */

const EstadoEnum = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'] as const;
export type EstadoSolicitud = (typeof EstadoEnum)[number];

export const SolicitudMuestreoSchema = new MongooseSchema(
  {
    creado_por: {
      type: SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    asignado_a: {
      type: SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campo_id: {
      type: SchemaTypes.ObjectId,
      ref: 'Campo',
      required: true,
      index: true,
    },
    mensaje: {
      type: String,
      required: true,
      trim: true,
    },
    estado: {
      type: String,
      enum: EstadoEnum,
      required: true,
      default: 'PENDIENTE',
    },
    fecha_limite: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'solicitudes_muestreo',
  },
);

/** Token de clase para MongooseModule.forFeature */
export class SolicitudMuestreo {}

export class SolicitudMuestreoDocument {
  _id: Types.ObjectId;
  creado_por: Types.ObjectId;
  asignado_a: Types.ObjectId;
  campo_id: Types.ObjectId;
  mensaje: string;
  estado: EstadoSolicitud;
  fecha_limite: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SolicitudMuestreoHydratedDocument = HydratedDocument<SolicitudMuestreoDocument>;
