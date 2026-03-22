/**
 * Barrel file — punto de entrada único para todas las abstracciones de fruit-ms.
 *
 * Importa así:
 *   import { ANALYSIS_REPOSITORY, I_INFERENCE_PORT } from './ports';
 *   import type { IAnalysisRepository, IInferencePort } from './ports';
 */

// Valores (runtime): tokens de inyección
export { ANALYSIS_REPOSITORY } from './analysis-repository.port';
export { I_INFERENCE_PORT } from './inference.port';

// Tipos (compile-time): interfaces y tipos de datos
export type {
  IAnalysisRepository,
  FindAllFilter,
  PaginatedResult,
} from './analysis-repository.port';

export type { IInferencePort } from './inference.port';

