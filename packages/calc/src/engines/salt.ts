// Brine from chlorides (workbook `DMR!BK380:BL380`; analysis §8.4).

/** Brine specific gravity from chlorides in mg/L (analysis §8.4). */
export function brineDensityFromChlorides(chloridesMgL: number): number {
  const cl = chloridesMgL;
  return 1 + 1.166e-6 * cl - 8.375e-13 * cl ** 2 + 1.338e-18 * cl ** 3;
}

/** NaCl, % by weight: Cl × 1.65 / (SG × 10000) (analysis §8.4). */
export function naclWeightPercent(chloridesMgL: number): number {
  if (chloridesMgL <= 0) return 0;
  return (chloridesMgL * 1.65) / (brineDensityFromChlorides(chloridesMgL) * 10000);
}
