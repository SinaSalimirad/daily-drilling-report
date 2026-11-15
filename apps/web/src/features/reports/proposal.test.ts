import { describe, expect, it } from 'bun:test';
import { nextDay, proposeNext } from './proposal';

describe('proposeNext', () => {
  it('proposes number 1 and the spud date for the first report', () => {
    expect(proposeNext(null, '2026-03-30')).toEqual({ reportNo: 1, reportDate: '2026-03-30' });
    expect(proposeNext(null, null)).toEqual({ reportNo: 1, reportDate: '' });
  });

  it('proposes previous + 1 and the next day', () => {
    expect(proposeNext({ reportNo: 4, reportDate: '2026-04-02' }, null)).toEqual({
      reportNo: 5,
      reportDate: '2026-04-03',
    });
  });

  it('rolls over month and year ends and leap days', () => {
    expect(nextDay('2026-03-31')).toBe('2026-04-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
    expect(nextDay('2028-02-28')).toBe('2028-02-29');
  });
});
