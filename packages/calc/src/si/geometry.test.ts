import { describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '../units';
import { averageHoleDiameterSI, holeVolumeAtDepthSI, totalHoleVolumeSI } from './geometry';

const m = (inches: number) => toSI(inches, 'in');
const day10 = [
  { type: 'casing' as const, top: 0, bottom: 2283, innerDiameter: m(8.625) },
  { type: 'open_hole' as const, top: 0, bottom: 2263, innerDiameter: m(8.375) },
];

describe('geometry SI adapter', () => {
  it('gives the workbook volumes back in m³ (day 10: 536.85 bbl at TD, 205.56 bbl at the bit)', () => {
    expect(fromSI(totalHoleVolumeSI(day10, 2263), 'bbl')).toBeCloseTo(536.85, 9);
    expect(fromSI(holeVolumeAtDepthSI(day10, 866, 'bit'), 'bbl')).toBeCloseTo(205.56, 9);
  });

  it('keeps the ID rounding at the bit depth although metres were converted to inches', () => {
    // 8.625 in = 0.219075 m exactly; the bit-depth table rounds it to 8.63 in.
    expect(fromSI(holeVolumeAtDepthSI(day10.slice(0, 1), 866, 'bit'), 'bbl')).toBeCloseTo(
      205.56,
      9,
    );
  });

  it('average diameter in metres (8.70 in on day 10)', () => {
    expect(fromSI(averageHoleDiameterSI(day10, 2263), 'in')).toBeCloseTo(8.7, 9);
  });
});
