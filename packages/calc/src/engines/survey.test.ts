import { describe, expect, it } from 'bun:test';
import { inclinationAtDepth, tvdAtDepth, tvdFromSurvey } from './survey';

// `Incl` method: 30 slices per interval. Hand-checked: the sum of cos(3k°), k = 1..30, is
// sin(45°)·cos(46.5°)/sin(1.5°) = 18.594, so a build from 0° to 90° over 100 m adds 61.98 m.
describe('tvdFromSurvey', () => {
  it('a vertical hole has TVD = MD', () => {
    const tvd = tvdFromSurvey([
      { md: 100, inc: 0, azi: 0 },
      { md: 250, inc: 0, azi: 0 },
    ]);
    expect(tvd).toEqual([100, 250]);
  });

  it('a build from 0° to 90° over 100 m adds 61.98 m of TVD', () => {
    const tvd = tvdFromSurvey([
      { md: 100, inc: 0, azi: 0 },
      { md: 200, inc: 90, azi: 0 },
    ]);
    expect(tvd[0]).toBe(100);
    expect(tvd[1]).toBeCloseTo(161.98, 2);
  });

  it('a horizontal interval adds nothing', () => {
    const tvd = tvdFromSurvey([
      { md: 100, inc: 90, azi: 0 },
      { md: 300, inc: 90, azi: 0 },
    ]);
    expect(tvd[1]).toBeCloseTo(tvd[0] ?? 0, 6);
  });
});

describe('lookups at a depth (nearest station at or above, no interpolation)', () => {
  const stations = [
    { md: 100, inc: 0, azi: 0 },
    { md: 200, inc: 30, azi: 0 },
  ];
  it('TVD and inclination come from the station above', () => {
    expect(tvdAtDepth(stations, 150)).toBe(100);
    expect(inclinationAtDepth(stations, 150)).toBe(0);
    expect(inclinationAtDepth(stations, 250)).toBe(30);
  });
  it('above the first station there is nothing', () => {
    expect(tvdAtDepth(stations, 50)).toBe(0);
    expect(inclinationAtDepth(stations, 50)).toBe(0);
  });
});
