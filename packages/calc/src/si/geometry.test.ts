import { describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '../units';
import { averageHoleDiameterSI, holeVolumeAtDepthSI, totalHoleVolumeSI } from './geometry';

const m = (inches: number) => toSI(inches, 'in');
const day10 = [
  { type: 'casing' as const, top: 0, bottom: 2283, innerDiameter: m(8.625) },
  { type: 'open_hole' as const, top: 0, bottom: 2263, innerDiameter: m(8.375) },
];

describe('geometry SI adapter', () => {
  it('gives the volumes back in m³ (day 10: 536.805 bbl at TD, 205.320 bbl at the bit)', () => {
    expect(fromSI(totalHoleVolumeSI(day10, 2263), 'bbl')).toBeCloseTo(536.805407, 5);
    expect(fromSI(holeVolumeAtDepthSI(day10, 866, 'bit'), 'bbl')).toBeCloseTo(205.319876, 5);
  });

  it('average diameter in metres (8.70 in on day 10)', () => {
    expect(fromSI(averageHoleDiameterSI(day10, 2263), 'in')).toBeCloseTo(8.696835, 6);
  });
});
