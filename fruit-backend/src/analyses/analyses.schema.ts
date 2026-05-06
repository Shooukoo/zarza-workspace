import { Schema, SchemaTypes, Types, HydratedDocument } from 'mongoose';

const CronogramaEtapaSchema = new Schema(
  {
    etapa: { type: String },
    cantidad: { type: Number },
    prediccion: {
      cambio_a: { type: String },
      en_dias: { type: Number },
      dias_para_cosecha: { type: Number },
    },
  },
  { _id: false },
);

const CronogramaCorregidoSchema = new Schema(
  {
    etapa: { type: String },
    cantidad: { type: Number },
  },
  { _id: false },
);

export const AnalysisSchema = new Schema(
  {
    image_id: { type: String },
    storage_key: { type: String },
    campo_id: { type: SchemaTypes.ObjectId },
    productor_id: { type: SchemaTypes.ObjectId },
    offline_sync_id: { type: String },
    fecha_analisis: { type: Date },
    metricas_salud: {
      total_elementos_detectados: { type: Number },
      elementos_sanos: { type: Number },
      elementos_enfermos: { type: Number },
      porcentaje_merma_general: { type: Number },
    },
    cronograma_fenologico: [CronogramaEtapaSchema],
    ubicacion_gps: {
      type: { type: String },
      coordinates: { type: [Number] },
    },
    validacion_experto: {
      fue_corregido: { type: Boolean, default: false },
      corregido_por: { type: SchemaTypes.ObjectId, ref: 'User' },
      fecha_correccion: { type: Date },
      diagnostico_original: { type: String },
      cronograma_corregido: [CronogramaCorregidoSchema],
      observaciones: { type: String },
    },
  },
  { collection: 'analyses' },
);

/** Token de clase para MongooseModule.forFeature */
export class Analysis {}

export interface CronogramaEtapa {
  etapa: string;
  cantidad: number;
  prediccion?: {
    cambio_a: string;
    en_dias: number;
    dias_para_cosecha: number;
  };
}

export interface CronogramaCorregido {
  etapa: string;
  cantidad: number;
}

export interface ValidacionExperto {
  fue_corregido: boolean;
  corregido_por?: Types.ObjectId;
  fecha_correccion?: Date;
  diagnostico_original?: string;
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}

export interface AnalysisDocument {
  _id: Types.ObjectId;
  image_id?: string;
  storage_key?: string;
  campo_id?: Types.ObjectId;
  productor_id?: Types.ObjectId;
  offline_sync_id?: string;
  fecha_analisis?: Date;
  metricas_salud?: {
    total_elementos_detectados: number;
    elementos_sanos: number;
    elementos_enfermos: number;
    porcentaje_merma_general: number;
  };
  cronograma_fenologico: CronogramaEtapa[];
  ubicacion_gps?: { type: string; coordinates: number[] };
  validacion_experto?: ValidacionExperto;
}

export type AnalysisHydratedDocument = HydratedDocument<AnalysisDocument>;
