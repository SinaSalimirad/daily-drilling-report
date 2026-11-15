import { describe, expect, it } from 'bun:test';
import { brineDensityFromChlorides, naclWeightPercent } from './salt';

describe('brineDensityFromChlorides', () => {
  it('188 000 mg/L → 1.198 (DMR!BL380)', () => {
    expect(brineDensityFromChlorides(188000)).toBe(1.198);
  });
  it('177 000 mg/L (DMR-SAVA-010 sample 1) → 1.188', () => {
    expect(brineDensityFromChlorides(177000)).toBe(1.188);
  });
});

describe('naclWeightPercent', () => {
  it('188 000 mg/L → 25.89 % (DMR!BK380)', () => {
    expect(naclWeightPercent(188000)).toBe(25.89);
  });
  it('177 000 mg/L → 24.58 %, shown as 24.6 on the DMR (day 10)', () => {
    expect(naclWeightPercent(177000)).toBe(24.58);
  });
  it('no chlorides, no salt', () => {
    expect(naclWeightPercent(0)).toBe(0);
  });
});
