import { Schema as MongooseSchema, SchemaTypes, Types, Document } from 'mongoose';

/**
 * Schema puro de Mongoose (sin decoradores NestJS) para evitar
 * el CannotDetermineTypeError con tipos anidados.
 * Se exporta como un token compatible con @InjectModel.
 */

const userSnapshotSchema = new MongooseSchema(
  {
    userId: { type: String, required: true, index: true },
    email:  { type: String, required: true },
  },
  { _id: false },
);

const prediccionSchema = new MongooseSchema(
  {
    cambio_a:          { type: String, required: true },
    en_dias:           { type: Number, required: true },
    dias_para_cosecha: { type: Number, required: true },
  },
  { _id: false },
);

const etapaFenologicaSchema = new MongooseSchema(
  {
    etapa:     { type: String, required: true },
    cantidad:  { type: Number, required: true },
    prediccion: { type: prediccionSchema, required: true },
  },
  { _id: false },
);

export const AnalysisSchema = new MongooseSchema(
  {
    image_id:       { type: String, required: true, index: true },
    storage_key:    { type: String, required: true },
    requester:      { type: userSnapshotSchema, required: true },
    variedad:       { type: String, default: null },
    fecha_analisis: { type: Date, required: true },

    metricas_salud: {
      type: new MongooseSchema(
        {
          total_elementos_detectados: { type: Number, required: true },
          elementos_sanos:            { type: Number, required: true },
          elementos_enfermos:         { type: Number, required: true },
          porcentaje_merma_general:   { type: Number, required: true },
        },
        { _id: false },
      ),
      required: true,
    },

    proyeccion_financiera: {
      type: new MongooseSchema(
        {
          peso_sano_gramos: { type: Number, required: true },
        },
        { _id: false },
      ),
      required: true,
    },

    cronograma_fenologico: { type: [etapaFenologicaSchema], required: true },

    // ── Nuevos campos: trazabilidad, geolocalización, offline, validación ──
    campo_id: {
      type: SchemaTypes.ObjectId,
      ref: 'Campo',
      required: true,
      index: true,
    },
    productor_id: {
      type: SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ubicacion_gps: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    offline_sync_id: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    validacion_experto: {
      type: new MongooseSchema(
        {
          fue_corregido:      { type: Boolean, default: false },
          corregido_por:      { type: SchemaTypes.ObjectId, ref: 'User', default: null },
          diagnostico_original: { type: String, default: null },
        },
        { _id: false },
      ),
      default: () => ({ fue_corregido: false }),
    },
  },
  { timestamps: true },
);

// Índice geoespacial para consultas de mapas de calor
AnalysisSchema.index({ ubicacion_gps: '2dsphere' });
// Índice para queries frecuentes por usuario
AnalysisSchema.index({ 'requester.userId': 1 });

/** Token de clase para que InjectModel funcione con MongooseModule.forFeature */
export class Analysis {}

/** Tipo tipado del documento Mongoose para uso en el repositorio */
export interface AnalysisDocument extends Document {
  image_id:       string;
  storage_key:    string;
  requester: {
    userId: string;
    email:  string;
  };
  variedad:       string | null;
  fecha_analisis: Date;
  metricas_salud: {
    total_elementos_detectados: number;
    elementos_sanos:            number;
    elementos_enfermos:         number;
    porcentaje_merma_general:   number;
  };
  proyeccion_financiera: {
    peso_sano_gramos: number;
  };
  cronograma_fenologico: Array<{
    etapa:     string;
    cantidad:  number;
    prediccion: {
      cambio_a:          string;
      en_dias:           number;
      dias_para_cosecha: number;
    };
  }>;
  campo_id:        Types.ObjectId;
  productor_id:    Types.ObjectId;
  ubicacion_gps: {
    type: 'Point';
    coordinates: [number, number];
  };
  offline_sync_id: string | null;
  validacion_experto: {
    fue_corregido:      boolean;
    corregido_por:      Types.ObjectId | null;
    diagnostico_original: string | null;
  };
}
