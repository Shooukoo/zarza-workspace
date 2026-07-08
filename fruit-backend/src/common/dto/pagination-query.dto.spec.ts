import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from './pagination-query.dto';
import {
  buildPaginated,
  clampPagination,
  MAX_PAGE_LIMIT,
} from '@rubus/database';

describe('PaginationQueryDto', () => {
  it('applies defaults page=1 limit=20 when omitted', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('transforms string query params to numbers', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '3', limit: '50' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });

  it('rejects page=0', async () => {
    const dto = plainToInstance(PaginationQueryDto, { page: '0' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'page')).toBe(true);
  });

  it(`rejects limit above MAX_PAGE_LIMIT (${MAX_PAGE_LIMIT})`, async () => {
    const dto = plainToInstance(PaginationQueryDto, {
      limit: String(MAX_PAGE_LIMIT + 1),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('rejects non-numeric limit', async () => {
    const dto = plainToInstance(PaginationQueryDto, { limit: 'abc' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });
});

describe('clampPagination', () => {
  it('applies defaults for undefined input', () => {
    expect(clampPagination()).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
      take: 20,
    });
  });

  it('computes skip/take from page and limit', () => {
    expect(clampPagination(3, 10)).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
      take: 10,
    });
  });

  it('clamps out-of-range values', () => {
    // 0 se trata como "no provisto" → defaults
    expect(clampPagination(0, 0)).toMatchObject({ page: 1, limit: 20 });
    expect(clampPagination(-5, MAX_PAGE_LIMIT + 500)).toMatchObject({
      page: 1,
      limit: MAX_PAGE_LIMIT,
    });
    expect(clampPagination(2, -10)).toMatchObject({ page: 2, limit: 1 });
  });
});

describe('buildPaginated', () => {
  it('computes totalPages and hasMore on a middle page', () => {
    const result = buildPaginated(['a', 'b'], 45, 2, 20);
    expect(result).toEqual({
      data: ['a', 'b'],
      total: 45,
      page: 2,
      limit: 20,
      totalPages: 3,
      hasMore: true,
    });
  });

  it('reports hasMore=false on the last page', () => {
    const result = buildPaginated(['a'], 45, 3, 20);
    expect(result.totalPages).toBe(3);
    expect(result.hasMore).toBe(false);
  });

  it('handles empty results', () => {
    const result = buildPaginated([], 0, 1, 20);
    expect(result.totalPages).toBe(0);
    expect(result.hasMore).toBe(false);
  });
});
