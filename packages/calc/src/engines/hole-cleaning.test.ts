import { describe, expect, it } from 'bun:test';
import { angleFactor, holeCleaning, slipVelocity, WATER_PPG } from './hole-cleaning';

const base = {
  annularVelocity: 120,
  holeIn: 8.625,
  cuttingDiameterIn: 0.25,
  cuttingThicknessIn: 0.1,
  densityPpg: 10,
  drillSolidsSg: 2.5,
  na: 0.7,
  ka: 1.2,
  reynolds: 1500,
  ropFtHr: 30,
  flowGpm: 400,
  inclinationDeg: 0,
};

describe('angleFactor', () => {
  it('1.00 at 0°, minus 0.04 per 5°, 0.50 from 65°', () => {
    expect(angleFactor(0)).toBe(1);
    expect(angleFactor(4.9)).toBe(1);
    expect(angleFactor(5)).toBeCloseTo(0.96, 12);
    expect(angleFactor(60)).toBeCloseTo(0.52, 12);
    expect(angleFactor(65)).toBe(0.5);
    expect(angleFactor(90)).toBe(0.5);
  });
});

describe('slipVelocity', () => {
  it('turbulent annulus: 16.62 τp / √ρ', () => {
    const tau = 7.9 * Math.sqrt(0.1 * (2.5 * WATER_PPG - 10));
    expect(slipVelocity({ ...base, reynolds: 3000 })).toBeCloseTo((16.62 * tau) / Math.sqrt(10), 9);
  });
  it('laminar annulus below the boundary shear rate uses the 1.22 expression', () => {
    const tau = 7.9 * Math.sqrt(0.1 * (2.5 * WATER_PPG - 10));
    const gammaP = (tau / 1.2) ** (1 / 0.7);
    const gammaB = 186 / (0.25 * Math.sqrt(10));
    expect(gammaP).toBeLessThan(gammaB);
    expect(slipVelocity(base)).toBeCloseTo(
      1.22 * tau * ((gammaP * 0.25) / Math.sqrt(10)) ** 0.5,
      9,
    );
  });
});

describe('holeCleaning', () => {
  it('a vertical hole with a fast annulus cleans well', () => {
    const out = holeCleaning({ ...base, annularVelocity: 250, ropFtHr: 5 });
    expect(out.transportEfficiency).toBeCloseTo((250 - out.slipVelocity) / 250, 12);
    expect(out.cuttingConcentration).toBeLessThan(0.05);
    expect(['V-Good', 'Good', 'OK']).toContain(out.verdict);
  });
  it('a cutting concentration above 5 % is V-Poor whatever the index says', () => {
    const out = holeCleaning({ ...base, ropFtHr: 5000 });
    expect(out.cuttingConcentration).toBeGreaterThan(0.05);
    expect(out.verdict).toBe('V-Poor');
  });
  it('a high angle lowers the index', () => {
    const vertical = holeCleaning({ ...base, annularVelocity: 250, ropFtHr: 5 });
    const tilted = holeCleaning({ ...base, annularVelocity: 250, ropFtHr: 5, inclinationDeg: 70 });
    expect(tilted.index / vertical.index).toBeCloseTo(0.5, 12);
  });
});
