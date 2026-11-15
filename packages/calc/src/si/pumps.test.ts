import { describe, expect, it } from 'bun:test';
import { fromSI, toSI } from '../units';
import { pumpOutputPerStrokeSI } from './pumps';

const round2 = (x: number) => Math.round(x * 100) / 100;

describe('pumpOutputPerStrokeSI', () => {
  it('reproduces the workbook golden case through SI (6 in × 12 in, 95 % → 4.19 gal)', () => {
    const m3 = pumpOutputPerStrokeSI({
      linerDiameter: toSI(6, 'in'),
      strokeLength: toSI(12, 'in'),
      efficiency: 95,
      type: 'triplex',
    });
    expect(round2(fromSI(m3, 'gal'))).toBe(4.19);
  });
});
