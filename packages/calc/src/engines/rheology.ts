// Rheology from the dial readings of the latest sample (workbook `DMR!E302:J305`; analysis §8.3).
// Oilfield units: dial readings (degrees), PV in cP, YP in lb/100 ft².

/** Plastic viscosity = R600 − R300, cP. */
export function plasticViscosity(r600: number, r300: number): number {
  return r600 - r300;
}

/** Yield point = R300 − PV, lb/100 ft². */
export function yieldPoint(r600: number, r300: number): number {
  return r300 - plasticViscosity(r600, r300);
}

export type PowerLaw = { n: number; k: number };

/** Power-law constants inside the pipe: n = 3.32 log10(R600/R300), K = 5.11 R300 / 511^n. */
export function powerLawPipe(r600: number, r300: number): PowerLaw | null {
  if (r600 <= 0 || r300 <= 0) return null;
  const n = 3.32 * Math.log10(r600 / r300);
  return { n, k: (5.11 * r300) / 511 ** n };
}

/** Power-law constants in the annulus: n = 0.657 log10(R100/R3), K = 5.11 R100 / 170.2^n. */
export function powerLawAnnulus(r100: number, r3: number): PowerLaw | null {
  if (r100 <= 0 || r3 <= 0) return null;
  const n = 0.657 * Math.log10(r100 / r3);
  return { n, k: (5.11 * r100) / 170.2 ** n };
}
