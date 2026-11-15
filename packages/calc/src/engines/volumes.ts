import { BBL_PER_M3 } from './geometry';

// Mud-volume block of the report (workbook `DMR!V10:AO17`, `BV17:BV26`; analysis §8.1).

/** US gallons per litre: the exact factor of docs/08. */
const GAL_PER_LITRE = 1 / 3.785411784;
/**
 * Pounds per cubic foot of water. One value everywhere (defect 7 of the analysis: the
 * workbook used 62.4 and 62.35; decision v0.8.5: 62.4, the value of the `DMR` sheet).
 */
export const WATER_PCF = 62.4;

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
  return {
    hole: positive(input.totalHole - input.steel - input.fluidNotMud),
    string: positive(input.internal),
    annulus: positive(input.atBit - input.closedDisplacement),
    belowBit: positive(input.totalHole - input.atBit),
  };
}

/** Total circulating volume = active + hole − below bit, bbl (`AB15`). */
export function totalCirculatingVolume(active: number, hole: number, belowBit: number): number {
  return positive(active + hole - belowBit);
}

export type PumpStroke = { galPerStroke: number; spm: number };

/** Flow rate Σ(gal/stroke × SPM), gal/min (`AH16`). */
export function flowRate(pumps: readonly PumpStroke[]): number {
  return pumps.reduce((sum, pump) => sum + pump.galPerStroke * pump.spm, 0);
}

const minutesFor = (volumeBbl: number, gpm: number) =>
  ((volumeBbl / BBL_PER_M3) * 1000 * GAL_PER_LITRE) / gpm;

/**
 * Bottoms-up time (minutes) and strokes (`AG17`): annulus volume over the flow rate; strokes
 * are the minutes times the total SPM. Null without a flow or a bit depth.
 */
export function bottomsUp(
  annulusBbl: number,
  pumps: readonly PumpStroke[],
  bitDepthM: number,
): { minutes: number; strokes: number } | null {
  const gpm = flowRate(pumps);
  if (gpm <= 0 || bitDepthM <= 0) return null;
  const totalSpm = pumps.reduce((sum, pump) => sum + pump.spm, 0);
  const minutes = minutesFor(annulusBbl, gpm);
  return { minutes, strokes: minutes * totalSpm };
}

/** Total circulation time, minutes (`AO17`); null without a flow. */
export function circulationTime(
  totalCirculatingBbl: number,
  pumps: readonly PumpStroke[],
): number | null {
  const gpm = flowRate(pumps);
  return gpm > 0 ? minutesFor(totalCirculatingBbl, gpm) : null;
}

/** Volume of the hole drilled in the day, bbl (`AA17`), at the hole size in inches. */
export function drilledVolume(holeSizeIn: number, drilledM: number): number {
  if (drilledM <= 0) return 0;
  return (holeSizeIn * 0.0254) ** 2 * (Math.PI / 4) * drilledM * BBL_PER_M3;
}

/** Tonnage of mud in a pit, metric tons (`MudPits(2)!L9`): MW / water weight × volume / 6.29. */
export function pitTonnage(mudWeightPcf: number, volumeBbl: number): number {
  return (mudWeightPcf / WATER_PCF) * (volumeBbl / BBL_PER_M3);
}
