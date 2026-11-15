import { BBL_PER_M3, roundTo } from './geometry';

// Mud-volume block of the report (workbook `DMR!V10:AO17`, `BV17:BV26`; analysis §8.1).

/** WORKBOOK-ROUNDING: litres → US gallons as the workbook writes it (`1 / 3.78541178`). */
const GAL_PER_LITRE = 1 / 3.78541178;
/** WORKBOOK-ROUNDING: pounds per cubic foot of water on `MudPits(2)` (`DMR` uses 62.4, defect 7). */
const WATER_PCF_PITS = 62.35;

const positive = (value: number) => (value > 0 ? value : 0);

export type HoleVolumeInput = {
  /** Total hole volume at TD, bbl (`BR15`). */
  totalHole: number;
  /** Hole volume down to the bit, bbl (`BQ15`). */
  atBit: number;
  /** Steel volume of the string, bbl (`BN30`). */
  steel: number;
  /** Internal volume of the string, bbl (`BO30`). */
  internal: number;
  /** Closed displacement of the string, bbl (`BP30`). */
  closedDisplacement: number;
  /** Volume of fluid in the hole that is not mud, bbl (`AA13`). */
  fluidNotMud: number;
};

export type HoleStringAnnulus = { hole: number; string: number; annulus: number; belowBit: number };

/** Hole, string, annulus and below-bit volumes as printed on the DMR, bbl. */
export function holeStringAnnulus(input: HoleVolumeInput): HoleStringAnnulus {
  // WORKBOOK-ROUNDING: the page shows whole barrels, the string with one decimal.
  return {
    hole: roundTo(positive(input.totalHole - input.steel - input.fluidNotMud), 0),
    string: roundTo(positive(input.internal), 1),
    annulus: roundTo(positive(input.atBit - input.closedDisplacement), 0),
    belowBit: roundTo(positive(input.totalHole - input.atBit), 0),
  };
}

/** Total circulating volume = active + hole − below bit, bbl (`AB15`, from the printed values). */
export function totalCirculatingVolume(active: number, hole: number, belowBit: number): number {
  return positive(active + hole - belowBit);
}

export type PumpStroke = { galPerStroke: number; spm: number };

/** Flow rate Σ(gal/stroke × SPM), gal/min, at the precision of `BP41` (not yet rounded to whole gpm). */
export function flowRateExact(pumps: readonly PumpStroke[]): number {
  return roundTo(
    pumps.reduce((sum, pump) => sum + pump.galPerStroke * pump.spm, 0),
    10,
  );
}

/** Flow rate as printed (`AH16`), gal/min. */
export function flowRate(pumps: readonly PumpStroke[]): number {
  return roundTo(flowRateExact(pumps), 0);
}

const minutesFor = (volumeBbl: number, gpm: number) =>
  ((volumeBbl / BBL_PER_M3) * 1000 * GAL_PER_LITRE) / gpm;

/**
 * Bottoms-up time and strokes (`AG17`): annulus volume over the flow rate. Strokes are the
 * minutes rounded to 2 decimals times the total SPM. Null without a flow or a bit depth.
 */
export function bottomsUp(
  annulusBbl: number,
  pumps: readonly PumpStroke[],
  bitDepthM: number,
): { minutes: number; strokes: number } | null {
  const gpm = flowRateExact(pumps);
  if (flowRate(pumps) * bitDepthM <= 0 || gpm <= 0) return null;
  const totalSpm = pumps.reduce((sum, pump) => sum + pump.spm, 0);
  const minutes = minutesFor(annulusBbl, gpm);
  return { minutes: roundTo(minutes, 0), strokes: roundTo(roundTo(minutes, 2) * totalSpm, 0) };
}

/** Total circulation time, minutes (`AO17`); null without a flow. */
export function circulationTime(
  totalCirculatingBbl: number,
  pumps: readonly PumpStroke[],
): number | null {
  const gpm = flowRate(pumps);
  return gpm > 0 ? roundTo(minutesFor(totalCirculatingBbl, gpm), 0) : null;
}

/** Volume of the hole drilled in the day, bbl (`AA17`), at the hole size in inches. */
export function drilledVolume(holeSizeIn: number, drilledM: number): number {
  if (drilledM <= 0) return 0;
  // WORKBOOK-ROUNDING: one decimal as displayed.
  return roundTo((holeSizeIn * 0.0254) ** 2 * (Math.PI / 4) * drilledM * BBL_PER_M3, 1);
}

/** Tonnage of mud in a pit, metric tons (`MudPits(2)!L9`): MW / water weight × volume / 6.29. */
export function pitTonnage(mudWeightPcf: number, volumeBbl: number): number {
  // WORKBOOK-ROUNDING: 3 decimals as displayed.
  return roundTo((mudWeightPcf / WATER_PCF_PITS) * (volumeBbl / BBL_PER_M3), 3);
}
