import { describe, expect, it } from 'bun:test';
import {
  bentoniteContent,
  massConcentration,
  solidsAnalysisUnweighted,
  solidsAnalysisWeighted,
} from './solids';

// The formulas of analysis §8.4 applied to the inputs of DMR-SAVA-010 sample 1 (MW 130 PCF,
// water 63 %, solids 37 %, salt volume 6.68 %). The sheet prints HGS 30.1 %; the analysis
// formulas give 29.9 % because the sheet's brine and mud-weight constants differ (KI-006, #151).
describe('solidsAnalysisWeighted', () => {
  const input = {
    mudWeightSg: 130 / 62.4,
    water: 63,
    saltVolume: 6.68,
    oil: 0,
    densityLgs: 1.6,
    densityHgs: 4.18,
    densityBrine: 1.185,
    densityOil: 0.84,
  };
  it('HGS and LGS add up to the corrected solids', () => {
    const { hgs, lgs } = solidsAnalysisWeighted(input);
    expect(hgs + lgs).toBeCloseTo(100 - 63 - 6.68, 10);
    expect(hgs).toBeCloseTo(29.9, 0);
    expect(lgs).toBeGreaterThan(0);
  });
  it('a mud of pure brine has no solids', () => {
    const out = solidsAnalysisWeighted({
      ...input,
      mudWeightSg: 1.185,
      water: 94,
      saltVolume: 6,
      oil: 0,
    });
    expect(out.hgs + out.lgs).toBeCloseTo(0, 10);
  });
});

describe('solidsAnalysisUnweighted', () => {
  it('LGS% = (MW − ρbrine) / (ρLGS − ρbrine) × 100', () => {
    const out = solidsAnalysisUnweighted({ mudWeightSg: 1.3, densityLgs: 2.6, densityBrine: 1 });
    expect(out.lgs).toBeCloseTo(18.75, 10);
    expect(out.hgs).toBe(0);
  });
});

describe('bentoniteContent', () => {
  it('(MBT − f × LGS) / (1 − f)', () => {
    expect(bentoniteContent(2.5, 30, 0.1)).toBeCloseTo((2.5 - 3) / 0.9, 12);
  });
});

describe('massConcentration', () => {
  it('% / 100 × ρ(ppg) × 42 = lb/bbl', () => {
    expect(massConcentration(10, 8.33)).toBeCloseTo(34.986, 6);
  });
});
