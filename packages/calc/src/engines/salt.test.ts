import { describe, expect, it } from 'bun:test';
import { brineDensityFromChlorides, naclWeightPercent } from './salt';

// Since v0.8.5 the engines do not round (the workbook rounded every cell "as displayed").
// The expected values are the exact results; the workbook value is named next to each and
// agrees with it to the precision the workbook displayed (the difference is the rounding
// the workbook did in between).

describe('brineDensityFromChlorides', () => {
  it('188 000 mg/L → 1.1985 (workbook DMR!BL380: 1.198)', () => {
    expect(brineDensityFromChlorides(188000)).toBeCloseTo(1.198498, 6);
  });
  it('177 000 mg/L (DMR-SAVA-010 sample 1) → 1.1876', () => {
    expect(brineDensityFromChlorides(177000)).toBeCloseTo(1.187563, 6);
  });
});

describe('naclWeightPercent', () => {
  it('188 000 mg/L → 25.88 % (workbook DMR!BK380: 25.89, from the density rounded to 1.198)', () => {
    expect(naclWeightPercent(188000)).toBeCloseTo(25.882397, 6);
  });
  it('177 000 mg/L → 24.59 %, shown as 24.6 on the DMR (day 10)', () => {
    expect(naclWeightPercent(177000)).toBeCloseTo(24.592369, 6);
  });
  it('no chlorides, no salt', () => {
    expect(naclWeightPercent(0)).toBe(0);
  });
});
