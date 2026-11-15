import { describe, expect, it } from 'bun:test';
import { convert } from '@ddr/calc/units';
import { totalsOf } from './pit-totals';

const si = (bbl: number) => convert(bbl, 'bbl', 'm3');

describe('totalsOf', () => {
  it('adds the volume of two active pits (workbook: active 180 bbl)', () => {
    // docs/08: balanceCheck has active 180 bbl; the split between the two pits is illustrative.
    const totals = totalsOf([
      { pitType: 'active', volume: si(100) },
      { pitType: 'active', volume: si(80) },
      { pitType: 'reserve', volume: null },
    ]);
    expect(convert(totals.active, 'm3', 'bbl')).toBeCloseTo(180, 9);
    expect(totals.reserve).toBe(0);
    expect(totals.not_mud).toBe(0);
  });

  it('keeps each pit type apart and ignores empty rows', () => {
    expect(
      totalsOf([
        { pitType: 'active', volume: 10 },
        { pitType: 'reserve', volume: 20 },
        { pitType: 'not_mud', volume: 5 },
        { pitType: 'not_mud', volume: 1 },
        { pitType: 'active', volume: null },
      ]),
    ).toEqual({ active: 10, reserve: 20, not_mud: 6 });
  });
});
