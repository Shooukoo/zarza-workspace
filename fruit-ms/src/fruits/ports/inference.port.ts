import { AnalysisDomain, UserSnapshot } from '../domain/analysis.entity';

export const I_INFERENCE_PORT = Symbol('I_INFERENCE_PORT');

/**
 * Puerto que abstrae la comunicación con el servicio de inferencia Python (fruit-inference).
 * FruitsService (capa de aplicación) depende ÚNICAMENTE de este contrato,
 * nunca de HttpService, URLs ni detalles HTTP.
 */
export interface IInferencePort {
  /**
   * Envía una imagen al servicio de inferencia y retorna el resultado de análisis.
   * @param imageId    - Identificador único de la imagen en el sistema.
   * @param storageKey - Clave de almacenamiento en el bucket/storage.
   * @param requester  - Snapshot del usuario que inició el análisis.
   * @throws {Error}   Si el servicio de inferencia no responde o retorna un error.
   */
  analyze(
    imageId: string,
    storageKey: string,
    requester: UserSnapshot,
  ): Promise<AnalysisDomain>;
}

