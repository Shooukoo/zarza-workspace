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
  estado?: 'pendiente' | 'validado' | 'rechazado';
  corregido_por?: string;
  fecha_correccion?: string;
  fecha_validacion?: string;
  diagnostico_original?: string;
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}

export interface MetricasSalud {
  total_elementos_detectados: number;
  elementos_sanos: number;
  elementos_enfermos: number;
  porcentaje_merma_general: number;
}

export interface Analysis {
  _id: string;
  image_id?: string;
  storage_key?: string;
  campo_id?: string;
  productor_id?: string;
  fecha_analisis?: string;
  metricas_salud?: MetricasSalud;
  cronograma_fenologico: CronogramaEtapa[];
  validacion_experto?: ValidacionExperto;
}

export interface AnalisisListResponse {
  data: Analysis[];
  total: number;
  page: number;
  limit: number;
}

export type EstadoValidacion = 'pendiente' | 'validado' | 'rechazado' | 'all';

export interface ValidateAnalisisPayload {
  action: 'validado' | 'rechazado';
  cronograma_corregido?: CronogramaCorregido[];
  observaciones?: string;
}
