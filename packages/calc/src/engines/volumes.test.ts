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

// Since v0.8.5 the engines do not round (the workbook rounded every cell "as displayed").
// The expected values are the exact results; the workbook value is named next to each and
// agrees with it to the precision the workbook displayed (the difference is the rounding
// the workbook did in between).
// Cases: docs/08 (report 1) and DMR-SAVA-010 (a string in the hole).

describe('holeStringAnnulus', () => {
  it('day 10: hole 518, string 50.3, annulus 136, below bit 331 (workbook V11, Y11, AB11, V13: 518, 50.3, 137, 331)', () => {
    const block = holeStringAnnulus({
      totalHole: 536.805407,
      atBit: 205.319876,
      steel: 18.681097,
      internal: 50.319492,
      closedDisplacement: 69.000589,
      fluidNotMud: 0,
    });
    expect(block.hole).toBeCloseTo(518.124, 3);
    expect(block.string).toBeCloseTo(50.319, 3);
    expect(block.annulus).toBeCloseTo(136.319, 3);
    expect(block.belowBit).toBeCloseTo(331.486, 3);
  });

  it('report 1: no string → hole and below bit are the whole hole', () => {
    expect(
      holeStringAnnulus({
        totalHole: 541.276302,
        atBit: 0,
        steel: 0,
        internal: 0,
        closedDisplacement: 0,
        fluidNotMud: 0,
      }),
    ).toEqual({ hole: 541.276302, string: 0, annulus: 0, belowBit: 541.276302 });
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
  it('day 10: 267 + 518 − 331 = 454 (workbook DMR!AB15)', () => {
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
  it('flow = Σ gal/stroke × SPM, gal/min (workbook DMR!AH16 showed 629)', () => {
    expect(flowRate(pumps)).toBeCloseTo(628.5, 9);
  });
  it('bottoms-up minutes and strokes from the annulus volume (DMR!AG17)', () => {
    // 137 bbl = 21.78 m³ = 5754 gal; / 628.5 gpm = 9.155 min; × 150 SPM = 1373 strokes.
    const out = bottomsUp(137, pumps, 866);
    expect(out?.minutes).toBeCloseTo(9.155, 2);
    expect(out?.strokes).toBeCloseTo(1373.3, 0);
  });
  it('total circulation time from the total circulating volume (DMR!AO17)', () => {
    expect(circulationTime(454, pumps)).toBeCloseTo(30.3, 1);
  });
  it('no flow, or no bit depth, gives nothing', () => {
    expect(bottomsUp(137, [{ galPerStroke: 4.19, spm: 0 }], 866)).toBeNull();
    expect(bottomsUp(137, pumps, 0)).toBeNull();
    expect(circulationTime(454, [])).toBeNull();
  });
});

describe('drilledVolume', () => {
  it('hole 9.625 in, 2283 m → 674.066 bbl (workbook DMR!AA17: 674.1)', () => {
    expect(drilledVolume(9.625, 2283)).toBeCloseTo(674.065783, 6);
  });
  it('nothing drilled, nothing to show', () => {
    expect(drilledVolume(9.625, 0)).toBe(0);
  });
});

describe('pitTonnage', () => {
  it('75 PCF, 150 bbl → 28.664 MT (workbook MudPits(2)!L9: 28.686, which used 62.35 PCF for water)', () => {
    expect(pitTonnage(75, 150)).toBeCloseTo(28.663575, 6);
  });
  it('75 PCF, 30 bbl → 5.733 MT (workbook MudPits(2)!L14: 5.737)', () => {
    expect(pitTonnage(75, 30)).toBeCloseTo(5.732715, 6);
  });
});
