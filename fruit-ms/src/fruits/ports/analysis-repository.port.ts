import { AnalysisDomain } from '../domain/analysis.entity';
import type { Paginated } from '@rubus/database';

export const ANALYSIS_REPOSITORY = Symbol('ANALYSIS_REPOSITORY');

export type FindAllFilter = {
  imageId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  productorId?: string;
  campoIds?: string[];
};

/** Envelope unificado de paginación — contrato compartido vía @rubus/database */
export type PaginatedResult<T> = Paginated<T>;

/**
 * Puerto (interfaz) que define el contrato para el adaptador de persistencia.
 * La capa de aplicación (FruitsService) depende SÓLO de este contrato,
 * nunca de la implementación concreta de Mongoose.
 */
export interface IAnalysisRepository {
  save(analysis: AnalysisDomain): Promise<string>;
  findAll(
    page: number,
    limit: number,
    filter: FindAllFilter,
  ): Promise<PaginatedResult<AnalysisDomain>>;
  findById(id: string): Promise<AnalysisDomain | null>;
}
