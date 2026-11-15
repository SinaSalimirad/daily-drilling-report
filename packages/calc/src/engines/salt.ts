// Brine from chlorides (workbook `DMR!BK380:BL380`; analysis §8.4).

/** Brine specific gravity from chlorides in mg/L, rounded to 3 decimals as the workbook shows it. */
export function brineDensityFromChlorides(chloridesMgL: number): number {
  const cl = chloridesMgL;
  const sg = 1 + 1.166e-6 * cl - 8.375e-13 * cl ** 2 + 1.338e-18 * cl ** 3;
  // WORKBOOK-ROUNDING: the brine density is used with 3 decimals (1.198 for 188 000 mg/L).
  return Math.round(sg * 1000) / 1000;
}

/** NaCl, % by weight: Cl × 1.65 / (SG × 10000), rounded to 2 decimals (25.89 for 188 000 mg/L). */
export function naclWeightPercent(chloridesMgL: number): number {
  if (chloridesMgL <= 0) return 0;
  const percent = (chloridesMgL * 1.65) / (brineDensityFromChlorides(chloridesMgL) * 10000);
  // WORKBOOK-ROUNDING: 2 decimals as displayed.
  return Math.round(percent * 100) / 100;
}
