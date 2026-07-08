"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAX_PAGE_LIMIT = exports.DEFAULT_PAGE_LIMIT = void 0;
exports.clampPagination = clampPagination;
exports.buildPaginated = buildPaginated;
exports.DEFAULT_PAGE_LIMIT = 20;
exports.MAX_PAGE_LIMIT = 200;
function clampPagination(page, limit) {
    const safePage = Math.max(1, Math.floor(page ?? 1) || 1);
    const safeLimit = Math.min(exports.MAX_PAGE_LIMIT, Math.max(1, Math.floor(limit ?? exports.DEFAULT_PAGE_LIMIT) || exports.DEFAULT_PAGE_LIMIT));
    return {
        page: safePage,
        limit: safeLimit,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
    };
}
function buildPaginated(data, total, page, limit) {
    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
    };
}
