export type TrainingJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ModelVersionStatus =
  | 'ENTRENADO'
  | 'LISTO_PARA_PROMOVER'
  | 'DESCARTADO'
  | 'PROMOVIDO'
  | 'REEMPLAZADO';

export interface ActiveModel {
  version: number;
  mAP: number | null;
  promovidoAt: string | null;
}

export interface ActiveJob {
  id: string;
  status: TrainingJobStatus;
  iniciadoAt: string;
}

export interface TrainingJobHistoryItem {
  id: string;
  status: TrainingJobStatus;
  datasetSize: number | null;
  errorMessage: string | null;
  iniciadoAt: string;
  finalizadoAt: string | null;
}

export interface ModelVersionHistoryItem {
  id: string;
  version: number;
  mAP: number | null;
  mAPBase: number | null;
  status: ModelVersionStatus;
  trainingJobId: string;
  createdAt: string;
}

export interface TrainingStatus {
  activeModel: ActiveModel | null;
  countNuevosAnalisisRevisados: number;
  umbralMinimo: number;
  activeJob: ActiveJob | null;
  historialJobs: TrainingJobHistoryItem[];
  historialVersiones: ModelVersionHistoryItem[];
}
