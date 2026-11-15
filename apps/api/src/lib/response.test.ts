import { describe, expect, it } from 'bun:test';
import { list, ok } from './response';

describe('ok', () => {
  it('omits warnings when there are none', () => {
    expect(ok({ id: 'a' })).toEqual({ data: { id: 'a' } });
    expect(ok({ id: 'a' }, [])).toEqual({ data: { id: 'a' } });
  });

  it('includes warnings when present', () => {
    const warning = { code: 'NEGATIVE_STOCK' as const, message: 'Stock below zero' };
    expect(ok(1, [warning])).toEqual({ data: 1, warnings: [warning] });
  });
});

describe('list', () => {
  it('wraps rows with pagination meta', () => {
    expect(list([1, 2], { page: 1, pageSize: 20, total: 2 })).toEqual({
      data: [1, 2],
      meta: { page: 1, pageSize: 20, total: 2 },
    });
  });
});
