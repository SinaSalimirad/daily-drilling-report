import { describe, expect, it } from 'bun:test';
import {
  closedDisplacement,
  drillPipeLength,
  internalVolume,
  steelVolume,
  stringVolumes,
  totalFlowArea,
} from './string';

// Since v0.8.5 the engines do not round (the workbook rounded every cell "as displayed").
// The expected values are the exact results; the workbook value is named next to each and
// agrees with it to the precision the workbook displayed (the difference is the rounding
// the workbook did in between).
// DMR-SAVA-010: drill pipe 5 in OD, 4.27 in ID, 866 m (bit depth 866 m, no other components).
const drillPipe = { lengthM: 866, odIn: 5, idIn: 4.2698412698412698 };

describe('drillPipeLength', () => {
  it('is the bit depth minus the other components (DMR!BK20)', () => {
    expect(drillPipeLength(866, [])).toBe(866);
    expect(drillPipeLength(866, [100, 66])).toBe(700);
  });
  it('is zero when the other components reach the bit depth', () => {
    expect(drillPipeLength(100, [100])).toBe(0);
  });
});

describe('string volumes of one component', () => {
  it('steel 2.970, internal 8.000, closed displacement 10.970 m³ (workbook CT5, CU5, CV5: 2.97, 8, 10.97)', () => {
    expect(steelVolume(drillPipe)).toBeCloseTo(2.970057, 6);
    expect(internalVolume(drillPipe)).toBeCloseTo(8.00016, 5);
    expect(closedDisplacement(drillPipe)).toBeCloseTo(10.970217, 6);
  });
  it('a component without length has no volume', () => {
    expect(steelVolume({ lengthM: 0, odIn: 5, idIn: 3 })).toBe(0);
  });
});

describe('stringVolumes', () => {
  it('steel 18.681, internal 50.319, displacement 69.001 bbl (workbook BN30, BO30, BP30: 18.68, 50.32, 69)', () => {
    const volumes = stringVolumes([drillPipe]);
    expect(volumes.steel).toBeCloseTo(18.681097, 6);
    expect(volumes.internal).toBeCloseTo(50.319492, 6);
    expect(volumes.closedDisplacement).toBeCloseTo(69.000589, 6);
  });
});

describe('totalFlowArea', () => {
  it('three 12/32 in nozzles → 0.3313 in²', () => {
    expect(totalFlowArea([{ size32: 12, quantity: 3 }])).toBeCloseTo(0.3313, 4);
  });
  it('a known TFA wins', () => {
    expect(totalFlowArea([{ size32: 12, quantity: 3 }], 0.5)).toBe(0.5);
  });
});
