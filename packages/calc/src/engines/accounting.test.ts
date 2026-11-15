import { describe, expect, it } from 'bun:test';
import {
  balanceCheck,
  builtVolume,
  chemicalVolumeBbl,
  endVolume,
  periodColumn,
  totalLosses,
} from './accounting';

// Since v0.8.5 the engines do not round (the workbook rounded every cell "as displayed").
// The expected values are the exact results; the workbook value is named next to each and
// agrees with it to the precision the workbook displayed (the difference is the rounding
// the workbook did in between).

const noLosses = {
  dumped: 0,
  shakers: 0,
  evaporation: 0,
  super_clone: 0,
  trip_loss: 0,
  desander_desilter: 0,
  pit_cleaning: 0,
  other: 0,
  formation: 0,
  left_in_hole: 0,
};

describe('chemicalVolumeBbl', () => {
  it('3.714 m³ → 23.36 bbl (workbook DMR!R65: 23.4)', () => {
    expect(chemicalVolumeBbl(3.714)).toBeCloseTo(23.360357, 6);
  });
});

describe('builtVolume', () => {
  it('water 157 + chemical 23.4 + diesel 0 → 180.4 bbl (workbook DMR!R69)', () => {
    expect(builtVolume(157, 23.4, 0)).toBeCloseTo(180.4, 12);
  });
});

describe('endVolume', () => {
  it('start 0, received 541, built 180.4 → 721.4 bbl (workbook DMR!R81 showed 721)', () => {
    expect(
      endVolume({ start: 0, received: 541, built: 180.4, returned: 0, losses: 0 }),
    ).toBeCloseTo(721.4, 12);
  });
  it('day 10: 1193 + 118.5 − 55.47 → 1256.03 bbl (workbook MudPits(2)!O26 showed 1256)', () => {
    const losses = totalLosses({
      shakers: 7,
      evaporation: 6,
      trip_loss: 21,
      other: 17,
      left_in_hole: 4.47,
    });
    expect(losses).toBeCloseTo(55.47, 12);
    expect(endVolume({ start: 1193, received: 0, built: 118.5, returned: 0, losses })).toBeCloseTo(
      1256.03,
      9,
    );
  });
});

describe('balanceCheck', () => {
  it('hole 541, active 180, reserve 0, end 721 → 0 (DMR!G86)', () => {
    expect(balanceCheck({ end: 721, hole: 541, active: 180, reserve: 0 })).toBe(0);
  });
  it('day 10: end 1256 = hole 518 + active 267 + reserve 471 → 0', () => {
    expect(balanceCheck({ end: 1256, hole: 518, active: 267, reserve: 471 })).toBe(0);
  });
  it('shows the difference when the books are off', () => {
    expect(balanceCheck({ end: 730, hole: 541, active: 180, reserve: 0 })).toBe(9);
  });
});

describe('periodColumn (section and well columns)', () => {
  it('recomputes total losses from the books and makes shakers the balancing item', () => {
    // A well of two days: start 0; received 541 on day 1; water 157 + 100, chemical 23.4 + 18.5.
    const column = periodColumn({
      start: 0,
      chemical: 41.9,
      end: 1256,
      entries: {
        water: 257,
        diesel: 0,
        received: 541,
        returned: 0,
        losses: { ...noLosses, dumped: 10, evaporation: 6, trip_loss: 21, shakers: 999 },
      },
    });
    expect(column.built).toBeCloseTo(298.9, 12);
    // 0 + 541 − 0 + 298.9 − 1256 < 0 → clamped to 0 as in the workbook.
    expect(column.totalLosses).toBe(0);
    expect(column.losses.shakers).toBe(0);
  });

  it('shakers = total losses − dumped − the other items (U71)', () => {
    const column = periodColumn({
      start: 1000,
      chemical: 0,
      end: 1050,
      entries: {
        water: 100,
        diesel: 0,
        received: 0,
        returned: 0,
        losses: { ...noLosses, dumped: 10, evaporation: 6, trip_loss: 14 },
      },
    });
    expect(column.totalLosses).toBeCloseTo(50, 12);
    expect(column.losses.shakers).toBeCloseTo(20, 12);
  });
});
