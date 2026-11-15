import { describe, expect, it } from 'bun:test';
import { isReferencedError, pgError } from './pg';

const pg = (code: string) =>
  Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('db'), { code }) });

describe('isReferencedError', () => {
  it('is true for a NO ACTION (23503) and a RESTRICT (23001) foreign key, also wrapped', () => {
    expect(isReferencedError(pg('23503'))).toBe(true);
    expect(isReferencedError(pg('23001'))).toBe(true);
  });

  it('is false for other errors', () => {
    expect(isReferencedError(pg('23505'))).toBe(false);
    expect(isReferencedError(new Error('plain'))).toBe(false);
    expect(isReferencedError(undefined)).toBe(false);
  });
});

describe('pgError', () => {
  it('reads codes with letters, e.g. 22P02', () => {
    expect(pgError(pg('22P02'))?.code).toBe('22P02');
  });
});
