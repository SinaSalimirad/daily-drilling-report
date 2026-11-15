import { describe, expect, it } from 'bun:test';
import {
  bottomsUp,
  circulationTime,
  drilledVolume,
  flowRate,
  holeStringAnnulus,
  pitTonnage,
  totalCirculatingVolume,
} from './volumes';

// Golden cases: docs/08 (report 1) and DMR-SAVA-010 (a string in the hole).

describe('holeStringAnnulus', () => {
  it('day 10: hole 518, string 50.3, annulus 137, below bit 331 (DMR!V11, Y11, AB11, V13)', () => {
    expect(
      holeStringAnnulus({
        totalHole: 536.85,
        atBit: 205.56,
        steel: 18.68,
        internal: 50.32,
        closedDisplacement: 69,
        fluidNotMud: 0,
      }),
    ).toEqual({ hole: 518, string: 50.3, annulus: 137, belowBit: 331 });
  });

  it('report 1: no string → hole 541, below bit 541', () => {
    expect(
      holeStringAnnulus({
        totalHole: 541.32,
        atBit: 0,
        steel: 0,
        internal: 0,
        closedDisplacement: 0,
        fluidNotMud: 0,
      }),
    ).toEqual({ hole: 541, string: 0, annulus: 0, belowBit: 541 });
  });

  it('subtracts the fluid that is not mud from the hole', () => {
    const out = holeStringAnnulus({
      totalHole: 100,
      atBit: 0,
      steel: 0,
      internal: 0,
      closedDisplacement: 0,
      fluidNotMud: 40,
    });
    expect(out.hole).toBe(60);
  });
});

describe('totalCirculatingVolume', () => {
  it('day 10: 267 + 518 − 331 = 454 (DMR!AB15)', () => {
    expect(totalCirculatingVolume(267, 518, 331)).toBe(454);
  });
  it('report 1: 180 + 541 − 541 = 180', () => {
    expect(totalCirculatingVolume(180, 541, 541)).toBe(180);
  });
  it('is never negative', () => {
    expect(totalCirculatingVolume(0, 0, 10)).toBe(0);
  });
});

describe('flowRate, bottomsUp, circulationTime', () => {
  const pumps = [
    { galPerStroke: 4.19, spm: 100 },
    { galPerStroke: 4.19, spm: 50 },
    { galPerStroke: 4.91, spm: 0 },
  ];
  it('flow = Σ gal/stroke × SPM, whole gal/min (DMR!AH16)', () => {
    expect(flowRate(pumps)).toBe(629);
  });
  it('bottoms-up minutes and strokes from the annulus volume (DMR!AG17)', () => {
    // 137 bbl / 6.29 × 1000 × 0.264172 gal/L = 5753.7 gal; / 628.5 gpm = 9.15 min.
    expect(bottomsUp(137, pumps, 866)).toEqual({ minutes: 9, strokes: 1373 });
  });
  it('total circulation time from the total circulating volume (DMR!AO17)', () => {
    expect(circulationTime(454, pumps)).toBe(30);
  });
  it('no flow, or no bit depth, gives nothing', () => {
    expect(bottomsUp(137, [{ galPerStroke: 4.19, spm: 0 }], 866)).toBeNull();
    expect(bottomsUp(137, pumps, 0)).toBeNull();
    expect(circulationTime(454, [])).toBeNull();
  });
});

describe('drilledVolume', () => {
  it('hole 9.625 in, 2283 m → 674.1 bbl (DMR!AA17)', () => {
    expect(drilledVolume(9.625, 2283)).toBe(674.1);
  });
  it('nothing drilled, nothing to show', () => {
    expect(drilledVolume(9.625, 0)).toBe(0);
  });
});

describe('pitTonnage', () => {
  it('75 PCF, 150 bbl → 28.686 MT (MudPits(2)!L9)', () => {
    expect(pitTonnage(75, 150)).toBe(28.686);
  });
  it('75 PCF, 30 bbl → 5.737 MT (MudPits(2)!L14)', () => {
    expect(pitTonnage(75, 30)).toBe(5.737);
  });
});
