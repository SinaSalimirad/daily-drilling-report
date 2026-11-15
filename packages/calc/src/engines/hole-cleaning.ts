// Hole cleaning per annular section (workbook `DMR` rows 442–503; analysis §8.6).
// Oilfield units: diameters in, ρ ppg, velocities ft/min, ROP ft/hr, Q gpm.

/** Pounds per gallon of water: 62.4 PCF (decision v0.8.5, one water weight; the workbook mixed 8.33 to 8.345). */
export const WATER_PPG = 8.345;

export type CleaningInput = {
  /** Annular velocity, ft/min. */
  annularVelocity: number;
  /** Hole (or casing) diameter, in. */
  holeIn: number;
  /** Cutting diameter and thickness, in. */
  cuttingDiameterIn: number;
  cuttingThicknessIn: number;
  /** Mud weight, ppg. */
  densityPpg: number;
  /** Drill-solids specific gravity (× 8.33 gives the cutting density, ppg). */
  drillSolidsSg: number;
  /** Annular power-law constants. */
  na: number;
  ka: number;
  reynolds: number;
  /** Rate of penetration, ft/hr. */
  ropFtHr: number;
  flowGpm: number;
  inclinationDeg: number;
};

export type CleaningVerdict = 'V-Good' | 'Good' | 'OK' | 'Poor' | 'V-Poor';

export type CleaningResult = {
  slipVelocity: number;
  transportVelocity: number;
  /** Fraction, 0–1. */
  transportEfficiency: number;
  /** Cutting concentration, fraction. */
  cuttingConcentration: number;
  angleFactor: number;
  index: number;
  verdict: CleaningVerdict;
};

/** Inclination factor: 1.00 at 0°, −0.04 per 5°, 0.50 from 65° up (`AO441:AP454`). */
export function angleFactor(inclinationDeg: number): number {
  if (inclinationDeg >= 65) return 0.5;
  return 1 - 0.04 * Math.floor(inclinationDeg / 5);
}

/** Slip velocity of a cutting, ft/min. */
export function slipVelocity(input: CleaningInput): number {
  const { cuttingDiameterIn: dc, cuttingThicknessIn: t, densityPpg: rho } = input;
  const cuttingDensity = input.drillSolidsSg * WATER_PPG;
  const boundaryShearRate = 186 / (dc * Math.sqrt(rho));
  const particleStress = 7.9 * Math.sqrt(t * (cuttingDensity - rho));
  const particleShearRate = (particleStress / input.ka) ** (1 / input.na);
  if (input.reynolds <= 2100 && particleShearRate < boundaryShearRate) {
    return 1.22 * particleStress * ((particleShearRate * dc) / Math.sqrt(rho)) ** 0.5;
  }
  // ASSUMED: the turbulent expression also covers a laminar annulus whose particle shear
  // rate is above the boundary rate; the analysis does not say what the sheet does then.
  return (16.62 * particleStress) / Math.sqrt(rho);
}

export function holeCleaning(input: CleaningInput): CleaningResult {
  const vs = slipVelocity(input);
  const vt = input.annularVelocity - vs;
  const efficiency = input.annularVelocity > 0 ? vt / input.annularVelocity : 0;
  const ca =
    efficiency > 0 && input.flowGpm > 0
      ? (input.ropFtHr * input.holeIn ** 2) / (14.71 * efficiency * 100 * input.flowGpm)
      : Number.POSITIVE_INFINITY;
  const factor = angleFactor(input.inclinationDeg);
  const index = efficiency * factor * (0.1 - ca / 1.5) * 10;
  const verdict: CleaningVerdict =
    ca > 0.05
      ? 'V-Poor'
      : index > 0.75
        ? 'V-Good'
        : index > 0.5
          ? 'Good'
          : index > 0.25
            ? 'OK'
            : 'Poor';
  return {
    slipVelocity: vs,
    transportVelocity: vt,
    transportEfficiency: efficiency,
    cuttingConcentration: ca,
    angleFactor: factor,
    index,
    verdict,
  };
}
