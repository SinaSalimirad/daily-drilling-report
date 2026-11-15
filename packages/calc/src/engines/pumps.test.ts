import { describe, expect, it } from 'bun:test';
import { pumpOutputPerStroke } from './pumps';

// Golden cases from the workbook, report 1 (docs/08). Compared at the 2 decimals
// the cells display.
const round2 = (x: number) => Math.round(x * 100) / 100;

describe('pumpOutputPerStroke', () => {
  it('triplex, liner 6 in, stroke 12 in, 95 % → 4.19 gal (DMR!BP37)', () => {
    expect(
      round2(pumpOutputPerStroke({ linerIn: 6, strokeIn: 12, efficiencyPct: 95, type: 'triplex' })),
    ).toBe(4.19);
  });

  it('triplex, liner 6.5 in, stroke 12 in, 95 % → 4.91 gal (DMR!BP39)', () => {
    expect(
      round2(
        pumpOutputPerStroke({ linerIn: 6.5, strokeIn: 12, efficiencyPct: 95, type: 'triplex' }),
      ),
    ).toBe(4.91);
  });

  it('a duplex has two thirds of the triplex output', () => {
    const triplex = pumpOutputPerStroke({
      linerIn: 6,
      strokeIn: 12,
      efficiencyPct: 95,
      type: 'triplex',
    });
    const duplex = pumpOutputPerStroke({
      linerIn: 6,
      strokeIn: 12,
      efficiencyPct: 95,
      type: 'duplex',
    });
    expect(duplex / triplex).toBeCloseTo(2 / 3, 12);
  });
});
