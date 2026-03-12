/**
 * Barrel file — punto de entrada único para todas las abstracciones de fruit-ms.
 *
 * Importa thus:
 *   import { ANALYSIS_REPOSITORY } from './ports';
 *   import type { IAnalysisRepository, FindAllFilter, PaginatedResult } from './ports';
 */

// Valor (runtime): token de inyección
export { ANALYSIS_REPOSITORY } from './analysis-repository.port';

// Tipos (compile-time): interfaces y tipos de datos
export type {
  IAnalysisRepository,
  FindAllFilter,
  PaginatedResult,
} from './analysis-repository.port';
