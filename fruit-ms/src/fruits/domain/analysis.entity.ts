/**
 * Entidad de dominio pura para un resultado de análisis fenológico.
 * No contiene decoradores de Mongoose, NestJS ni ninguna librería externa.
 * Es el único tipo que la capa de aplicación (Use Cases) conoce.
 */

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
  variedad: string | null;
  fecha_analisis: string;
  metricas_salud: MetricasSalud;
  proyeccion_financiera: ProyeccionFinanciera;
  cronograma_fenologico: EtapaFenologica[];
}
