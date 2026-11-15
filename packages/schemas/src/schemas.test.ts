import { describe, expect, it } from 'bun:test';
import { paginationQuerySchema, reportDateSchema, sortSchema } from './base';
import { unitSystemSchema } from './unit-system';
import { QUANTITIES } from './units';

describe('reportDateSchema', () => {
  it('accepts YYYY-MM-DD and rejects other text', () => {
    expect(reportDateSchema.safeParse('2026-07-28').success).toBe(true);
    for (const bad of ['28/07/2026', '2026-7-28', '2026-02-30', 'yesterday']) {
      expect(reportDateSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('paginationQuerySchema', () => {
  it('defaults to page 1 of 20 and coerces query strings', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('rejects page 0 and pageSize above 100', () => {
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});

describe('sortSchema', () => {
  const sort = sortSchema(['name', 'createdAt']);

  it('parses field:direction for declared fields', () => {
    expect(sort.parse('name:asc')).toEqual({ field: 'name', direction: 'asc' });
    expect(sort.parse('createdAt:desc')).toEqual({ field: 'createdAt', direction: 'desc' });
  });

  it('rejects undeclared fields and bad directions', () => {
    expect(sort.safeParse('password:asc').success).toBe(false);
    expect(sort.safeParse('name:up').success).toBe(false);
    expect(sort.safeParse('name').success).toBe(false);
  });
});

describe('unitSystemSchema', () => {
  const si = Object.fromEntries(QUANTITIES.map((q) => [q, unitSystemSchema.shape[q].options[0]]));

  it('accepts one allowed unit per quantity', () => {
    expect(unitSystemSchema.safeParse(si).success).toBe(true);
  });

  it('rejects a unit of another quantity, a missing quantity and unknown keys', () => {
    expect(unitSystemSchema.safeParse({ ...si, density: 'bbl' }).success).toBe(false);
    const { volume: _omit, ...missing } = si;
    expect(unitSystemSchema.safeParse(missing).success).toBe(false);
    expect(unitSystemSchema.safeParse({ ...si, colour: 'red' }).success).toBe(false);
  });
});
