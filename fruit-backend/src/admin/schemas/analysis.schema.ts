import { Schema, SchemaTypes, Document } from 'mongoose';

/**
 * Minimalist schema to query the `analyses` collection created by `fruit-ms`.
 * Used exclusively for Admin Dashboard read-only aggregations.
 */
export const AnalysisDashboardSchema = new Schema(
  {
    // Solo definimos lo esencial para las proyecciones y KPIs
    fecha_analisis: { type: Date },
    metricas_salud: {
      total_elementos_detectados: { type: Number },
      elementos_sanos: { type: Number },
      elementos_enfermos: { type: Number },
      porcentaje_merma_general: { type: Number },
    },
    proyeccion_financiera: {
      peso_sano_gramos: { type: Number },
    },
    cronograma_fenologico: [
      {
        etapa: { type: String },
        cantidad: { type: Number },
        prediccion: {
          cambio_a: { type: String },
          en_dias: { type: Number },
          dias_para_cosecha: { type: Number },
        },
      },
    ],
    // Nuevos campos (read-only mirror)
    campo_id:     { type: SchemaTypes.ObjectId },
    productor_id: { type: SchemaTypes.ObjectId },
    ubicacion_gps: {
      type:        { type: String },
      coordinates: { type: [Number] },
    },
    offline_sync_id: { type: String },
    validacion_experto: {
      fue_corregido:      { type: Boolean },
      corregido_por:      { type: SchemaTypes.ObjectId },
      diagnostico_original: { type: String },
    },
  },
  { collection: 'analyses' },
);

export class AnalysisDashboardDocument {
  fecha_analisis: Date;
  metricas_salud: {
    total_elementos_detectados: number;
    elementos_sanos: number;
    elementos_enfermos: number;
    porcentaje_merma_general: number;
  };
  proyeccion_financiera: {
    peso_sano_gramos: number;
  };
  cronograma_fenologico: {
    etapa: string;
    cantidad: number;
    prediccion: {
      cambio_a: string;
      en_dias: number;
      dias_para_cosecha: number;
    };
  }[];
}
