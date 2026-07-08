export interface Paginated<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
}
export declare const DEFAULT_PAGE_LIMIT = 20;
export declare const MAX_PAGE_LIMIT = 200;
export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
    take: number;
}
export declare function clampPagination(page?: number, limit?: number): PaginationParams;
export declare function buildPaginated<T>(data: T[], total: number, page: number, limit: number): Paginated<T>;
//# sourceMappingURL=pagination.d.ts.map