/**
 * Contrato de paginación offset unificado para todo el stack.
 * Entrada: page ≥ 1, 1 ≤ limit ≤ MAX_PAGE_LIMIT (defaults 1/20).
 * Salida: envelope { data, total, page, limit, totalPages, hasMore }.
 */

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 200;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Normaliza page/limit a valores seguros y calcula skip/take para Prisma. */
export function clampPagination(page?: number, limit?: number): PaginationParams {
  const safePage = Math.max(1, Math.floor(page ?? 1) || 1);
  const safeLimit = Math.min(
    MAX_PAGE_LIMIT,
    Math.max(1, Math.floor(limit ?? DEFAULT_PAGE_LIMIT) || DEFAULT_PAGE_LIMIT),
  );
  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}

/** Construye el envelope de respuesta unificado. */
export function buildPaginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): Paginated<T> {
  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  };
}
