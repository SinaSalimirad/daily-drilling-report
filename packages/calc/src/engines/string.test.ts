import { describe, expect, it } from 'bun:test';
import {
  closedDisplacement,
  drillPipeLength,
  internalVolume,
  steelVolume,
  stringVolumes,
  totalFlowArea,
} from './string';

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
  it('steel 2.97, internal 8, closed displacement 10.97 m³ (CT5, CU5, CV5)', () => {
    expect(steelVolume(drillPipe)).toBe(2.97);
    expect(internalVolume(drillPipe)).toBe(8);
    expect(closedDisplacement(drillPipe)).toBe(10.97);
  });
  it('a component without length has no volume', () => {
    expect(steelVolume({ lengthM: 0, odIn: 5, idIn: 3 })).toBe(0);
  });
});

describe('stringVolumes', () => {
  it('steel 18.68, internal 50.32, displacement 69 bbl (DMR!BN30, BO30, BP30)', () => {
    expect(stringVolumes([drillPipe])).toEqual({
      steel: 18.68,
      internal: 50.32,
      closedDisplacement: 69,
    });
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
