import { describe, expect, it } from 'bun:test';
import {
  averageHoleDiameter,
  BBL_PER_M3,
  type HoleSection,
  holeVolumeAtDepth,
  sectionVolume,
  totalHoleVolume,
} from './geometry';

// Since v0.8.5 the engines do not round (the workbook rounded every cell "as displayed").
// The expected values are the exact results; the workbook value is named next to each and
// agrees with it to the precision the workbook displayed (the difference is the rounding
// the workbook did in between).
// Cases of the workbook (docs/08; DMR-SAVA-001 and DMR-SAVA-010).

describe('sectionVolume', () => {
  it('ID 8.625 in, 0–2283 m → 86.056 m³ (workbook DMR!CI20: 86.06)', () => {
    expect(sectionVolume(8.625, 2283)).toBeCloseTo(86.056055, 6);
    expect(sectionVolume(8.625, 2283)).toBeCloseTo(86.06, 1);
  });
});

const day1: HoleSection[] = [{ type: 'casing', topM: 0, bottomM: 2283, idIn: 8.625 }];
// Day 10: casing to 2283 m, then an open hole with a TD above the shoe (2263 m).
const day10: HoleSection[] = [
  { type: 'casing', topM: 0, bottomM: 2283, idIn: 8.625 },
  { type: 'open_hole', topM: 0, bottomM: 2263, idIn: 8.375 },
];

describe('totalHoleVolume', () => {
  it('one casing 0–2283 m → 541.276 bbl (workbook DMR!BR5: 541.32, which rounded 86.06 m³ first)', () => {
    expect(totalHoleVolume(day1, 2283)).toBeCloseTo(541.276302, 6);
    expect(totalHoleVolume(day1, 2283)).toBeCloseTo(541.32, 0);
  });

  it('casing + open hole with a negative interval → 536.805 bbl (workbook DMR-SAVA-010 BR15: 536.85)', () => {
    expect(totalHoleVolume(day10, 2263)).toBeCloseTo(536.805407, 6);
  });

  it('a section list without sections is empty', () => {
    expect(totalHoleVolume([], 1000)).toBe(0);
  });
});

describe('holeVolumeAtDepth', () => {
  it('to the bit depth: 866 m → 205.320 bbl (workbook BQ15: 205.56, which rounded the ID to 8.63 in)', () => {
    expect(holeVolumeAtDepth(day10, 866, 'bit')).toBeCloseTo(205.319876, 6);
  });

  it('a liner counts down to the top of the next liner only', () => {
    const sections: HoleSection[] = [
      { type: 'casing', topM: 0, bottomM: 1000, idIn: 10 },
      { type: 'liner', topM: 900, bottomM: 2000, idIn: 8 },
    ];
    // The casing above a liner counts down to the liner top (900 m); the liner from there to 2000 m.
    const casing = sectionVolume(10, 900);
    const liner = sectionVolume(8, 1100);
    expect(holeVolumeAtDepth(sections, 2000, 'td')).toBeCloseTo((casing + liner) * BBL_PER_M3, 9);
  });
});

describe('averageHoleDiameter', () => {
  it('one section → its ID (workbook WBG!M18 showed 8.63: the ID rounded)', () => {
    expect(averageHoleDiameter(day1, 2283)).toBeCloseTo(8.625, 9);
  });

  it('weighs a negative open-hole interval as zero diameter → 8.697 in (workbook day 10: 8.70)', () => {
    expect(averageHoleDiameter(day10, 2263)).toBeCloseTo(8.696835, 6);
  });
});
