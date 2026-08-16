export interface TrainingDatasetDeteccion {
  clase: string;
  sano: boolean;
  bbox: [number, number, number, number];
}

export interface TrainingDatasetEntry {
  imageUrl: string;
  detecciones: TrainingDatasetDeteccion[];
}

export interface TrainingStatusResponse {
  activeModel: { version: number; mAP: number | null; promovidoAt: Date | null } | null;
  countNuevosAnalisisRevisados: number;
  umbralMinimo: number;
  activeJob: { id: string; status: string; iniciadoAt: Date } | null;
  historialJobs: Array<{
    id: string;
    status: string;
    datasetSize: number | null;
    errorMessage: string | null;
    iniciadoAt: Date;
    finalizadoAt: Date | null;
  }>;
  historialVersiones: Array<{
    id: string;
    version: number;
    mAP: number | null;
    mAPBase: number | null;
    status: string;
    trainingJobId: string;
    createdAt: Date;
  }>;
}
