import { describe, expect, it } from 'bun:test';
import { plasticViscosity, powerLawAnnulus, powerLawPipe, yieldPoint } from './rheology';

// DMR-SAVA-010, sample 1: R600 84, R300 48 → PV 36 cP, YP 12 lb/100 ft² (DMR!L29, L30).
describe('plasticViscosity and yieldPoint', () => {
  it('PV = R600 − R300 and YP = R300 − PV (day 10)', () => {
    expect(plasticViscosity(84, 48)).toBe(36);
    expect(yieldPoint(84, 48)).toBe(12);
  });
});

describe('power law', () => {
  it('pipe: n = 3.32 log10(R600/R300), K = 5.11 R300 / 511^n', () => {
    const law = powerLawPipe(84, 48);
    expect(law?.n).toBeCloseTo(3.32 * Math.log10(84 / 48), 12);
    expect(law?.n).toBeCloseTo(0.8069, 4);
    expect(law?.k).toBeCloseTo((5.11 * 48) / 511 ** (law?.n ?? 0), 12);
  });
  it('annulus: n = 0.657 log10(R100/R3), K = 5.11 R100 / 170.2^n', () => {
    const law = powerLawAnnulus(22, 3);
    expect(law?.n).toBeCloseTo(0.657 * Math.log10(22 / 3), 12);
    expect(law?.k).toBeCloseTo((5.11 * 22) / 170.2 ** (law?.n ?? 0), 12);
  });
  it('is unknown without readings', () => {
    expect(powerLawPipe(0, 0)).toBeNull();
    expect(powerLawAnnulus(5, 0)).toBeNull();
  });
});
