import { describe, expect, it } from 'bun:test';
import {
  averageHoleDiameter,
  type HoleSection,
  holeVolumeAtDepth,
  sectionVolume,
  totalHoleVolume,
} from './geometry';

// Golden cases of the workbook (docs/08; DMR-SAVA-001 and DMR-SAVA-010).

describe('sectionVolume', () => {
  it('ID 8.625 in, 0–2283 m → 86.06 m³ (DMR!CI20)', () => {
    expect(sectionVolume(8.625, 2283)).toBe(86.06);
  });
});

const day1: HoleSection[] = [{ type: 'casing', topM: 0, bottomM: 2283, idIn: 8.625 }];
// Day 10: casing to 2283 m, then an open hole with a TD above the shoe (2263 m).
const day10: HoleSection[] = [
  { type: 'casing', topM: 0, bottomM: 2283, idIn: 8.625 },
  { type: 'open_hole', topM: 0, bottomM: 2263, idIn: 8.375 },
];

describe('totalHoleVolume', () => {
  it('one casing 0–2283 m → 541.32 bbl (DMR!BR5, the rounding case of docs/08)', () => {
    expect(totalHoleVolume(day1, 2283)).toBe(541.32);
  });

  it('casing + open hole with a negative interval → 536.85 bbl (DMR-SAVA-010 BR15)', () => {
    expect(totalHoleVolume(day10, 2263)).toBe(536.85);
  });

  it('a section list without sections is empty', () => {
    expect(totalHoleVolume([], 1000)).toBe(0);
  });
});

describe('holeVolumeAtDepth', () => {
  it('to the bit depth the ID is rounded to 2 decimals: 866 m → 205.56 bbl (BQ15)', () => {
    expect(holeVolumeAtDepth(day10, 866, 'bit')).toBe(205.56);
  });

  it('a liner counts down to the top of the next liner only', () => {
    const sections: HoleSection[] = [
      { type: 'casing', topM: 0, bottomM: 1000, idIn: 10 },
      { type: 'liner', topM: 900, bottomM: 2000, idIn: 8 },
    ];
    // The casing above a liner counts down to the liner top (900 m); the liner from there to 2000 m.
    const casing = sectionVolume(10, 900);
    const liner = sectionVolume(8, 1100);
    expect(holeVolumeAtDepth(sections, 2000, 'td')).toBeCloseTo(
      Math.round(casing * 6.29 * 100) / 100 + Math.round(liner * 6.29 * 100) / 100,
      2,
    );
  });
});

describe('averageHoleDiameter', () => {
  it('one section → its ID (8.63 in at 2 decimals, WBG!M18 on day 1)', () => {
    expect(averageHoleDiameter(day1, 2283)).toBe(8.63);
  });

  it('weighs a negative open-hole interval as zero diameter → 8.70 in (day 10)', () => {
    expect(averageHoleDiameter(day10, 2263)).toBe(8.7);
  });
});
