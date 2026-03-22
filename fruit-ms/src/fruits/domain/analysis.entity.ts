/**
 * Entidad de dominio pura para un resultado de análisis fenológico.
 * No contiene decoradores de Mongoose, NestJS ni ninguna librería externa.
 * Es el único tipo que la capa de aplicación (Use Cases) conoce.
 */

/**
 * Snapshot inmutable del usuario que solicitó el análisis.
 * Se almacena junto al análisis para trazabilidad histórica.
 * Si el usuario cambia su email en fruit-backend, el snapshot
 * conserva el email original (consistencia eventual intencional).
 */
export type UserSnapshot = {
  userId: string;  // ID canónico en fruit-backend
  email: string;   // Snapshot al momento del análisis
};

export type Prediccion = {
  cambio_a: string;
  en_dias: number;
  dias_para_cosecha: number;
};

export type EtapaFenologica = {
  etapa: string;
  cantidad: number;
  prediccion: Prediccion;
};

export type MetricasSalud = {
  total_elementos_detectados: number;
  elementos_sanos: number;
  elementos_enfermos: number;
  porcentaje_merma_general: number;
};


export type ProyeccionFinanciera = {
  peso_sano_gramos: number;
};


export interface AnalysisDomain {
  /** _id de MongoDB asignado tras la persistencia (undefined antes de guardar) */
  id?: string;
  image_id: string;
  storage_key: string;
  /** Snapshot del usuario que solicitó el análisis. */
  requester: UserSnapshot;
  variedad: string | null;
  /** Fecha del análisis como tipo Date (tipo semántico de dominio, no string de red). */
  fecha_analisis: Date;
  metricas_salud: MetricasSalud;
  proyeccion_financiera: ProyeccionFinanciera;
  cronograma_fenologico: EtapaFenologica[];
}
