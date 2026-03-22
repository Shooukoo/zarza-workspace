import { Schema as MongooseSchema, Document } from 'mongoose';

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
  },
  { timestamps: true },
);

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
}
