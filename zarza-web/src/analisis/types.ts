export interface FenologiaEtapa {
  id: string;
  etapa: string;
  cantidad: number;
  cambiaA: string;
  enDias: number;
  diasParaCosecha: number;
}

export interface CronogramaCorregido {
  etapa: string;
  cantidad: number;
}

export interface Analysis {
  id: string;
  imageId?: string;
  storageKey?: string;
  campoId?: string;
  campo?: { id: string; codigoCampo: string; nombre: string };
  productorId?: string;
  fechaAnalisis?: string;
  totalElementosDetectados?: number;
  elementosSanos?: number;
  elementosEnfermos?: number;
  porcentajeMermaGeneral?: number;
  pesoSanoGramos?: number;
  validacionEstado?: 'pendiente' | 'validado' | 'rechazado';
  validacionFueCorregido?: boolean;
  validacionObservaciones?: string;
  validacionCronogramaCorregido?: CronogramaCorregido[];
  fenologiaEtapas: FenologiaEtapa[];
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
