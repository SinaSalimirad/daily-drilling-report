// Solids analysis of the water-based mud sheet (`Solid Ana`; analysis §8.4). Densities as
// specific gravities (the sheet's own inputs); volumes in % by volume.

export type SolidsInput = {
  /** Mud weight as specific gravity (PCF ÷ the water weight of the sheet). */
  mudWeightSg: number;
  /** Retort water, % vol. */
  water: number;
  /** Volume of the dissolved salt, % vol. */
  saltVolume: number;
  /** Retort oil, % vol. */
  oil: number;
  densityLgs: number;
  densityHgs: number;
  densityBrine: number;
  densityOil: number;
};

export type SolidsResult = {
  /** % vol. */
  hgs: number;
  lgs: number;
};

/**
 * Weighted mud: HGS% = [100·MW − (100 − Water − Vsalt − Oil)·ρLGS − (Water + Vsalt)·ρbrine −
 * Oil·ρoil] / (ρHGS − ρLGS); LGS% = 100 − Water − Vsalt − Oil − HGS%.
 */
export function solidsAnalysisWeighted(input: SolidsInput): SolidsResult {
  const { mudWeightSg, water, saltVolume, oil, densityLgs, densityHgs, densityBrine, densityOil } =
    input;
  const solids = 100 - water - saltVolume - oil;
  const hgs =
    (100 * mudWeightSg -
      solids * densityLgs -
      (water + saltVolume) * densityBrine -
      oil * densityOil) /
    (densityHgs - densityLgs);
  return { hgs, lgs: solids - hgs };
}

/** Unweighted mud: LGS% = (MW − ρbrine) / (ρLGS − ρbrine) × 100, no high-gravity solids. */
export function solidsAnalysisUnweighted(input: {
  mudWeightSg: number;
  densityLgs: number;
  densityBrine: number;
}): SolidsResult {
  const lgs =
    ((input.mudWeightSg - input.densityBrine) / (input.densityLgs - input.densityBrine)) * 100;
  return { hgs: 0, lgs };
}

/** Bentonite = (MBT − f × LGS) / (1 − f), with `f` the bentonite fraction of the drill solids. */
export function bentoniteContent(mbt: number, lgs: number, fraction: number): number {
  return (mbt - fraction * lgs) / (1 - fraction);
}

/** Mass concentration, lb/bbl: % / 100 × ρ(ppg) × 42. */
export function massConcentration(percentVolume: number, densityPpg: number): number {
  return (percentVolume / 100) * densityPpg * 42;
}
