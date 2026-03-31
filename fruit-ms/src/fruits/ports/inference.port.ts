import { AnalysisDomain, UserSnapshot } from '../domain/analysis.entity';

export const I_INFERENCE_PORT = Symbol('I_INFERENCE_PORT');

export type InferenceContext = {
  campoId?:       string | null;
  productorId?:   string | null;
  gpsLat?:        number | null;
  gpsLon?:        number | null;
  offlineSyncId?: string | null;
};

/**
 * Puerto que abstrae la comunicación con el servicio de inferencia Python (fruit-inference).
 * FruitsService (capa de aplicación) depende ÚNICAMENTE de este contrato.
 */
export interface IInferencePort {
  /**
   * Envía una imagen al servicio de inferencia y retorna el resultado de análisis.
   * @param imageId    - Identificador único de la imagen en el sistema.
   * @param storageKey - Clave de almacenamiento en el bucket/storage.
   * @param requester  - Snapshot del usuario que inició el análisis.
   * @param context    - Metadatos V2: campo, productor, GPS, offline_sync_id.
   */
  analyze(
    imageId: string,
    storageKey: string,
    requester: UserSnapshot,
    context?: InferenceContext,
  ): Promise<AnalysisDomain>;
}
