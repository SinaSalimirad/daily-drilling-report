// Hydraulics, power-law model (workbook `DMR` rows 393–433, `Hyd Calc.`; analysis §8.5).
// Oilfield units: Q gpm, diameters in, ρ ppg, V ft/min, L ft, ΔP psi.

export type PowerLawConstants = { n: number; k: number };

export type SegmentResult = {
  /** ft/min. */
  velocity: number;
  /** Effective viscosity, cP. */
  viscosity: number;
  reynolds: number;
  frictionFactor: number;
  /** psi. */
  pressureLoss: number;
  regime: 'laminar' | 'transient' | 'turbulent';
};

/** Flow regime labels of `Hyd Calc.`: laminar < 2100, transient up to 4100, turbulent above. */
export function flowRegime(reynolds: number): SegmentResult['regime'] {
  if (reynolds < 2100) return 'laminar';
  return reynolds <= 4100 ? 'transient' : 'turbulent';
}

function friction(reynolds: number, n: number, laminarNumerator: number): number {
  if (reynolds < 2100) return laminarNumerator / reynolds;
  const logN = Math.log10(n);
  return (logN + 3.93) / 50 / reynolds ** ((1.75 - logN) / 7);
}

/** Pressure loss inside a pipe of the string. */
export function pipePressureLoss(input: {
  flowGpm: number;
  idIn: number;
  lengthFt: number;
  densityPpg: number;
  law: PowerLawConstants;
}): SegmentResult {
  const { flowGpm: q, idIn, lengthFt, densityPpg: rho, law } = input;
  const velocity = (24.48 * q) / idIn ** 2;
  const viscosity =
    100 *
    law.k *
    ((1.6 * velocity) / idIn) ** (law.n - 1) *
    ((3 * law.n + 1) / (4 * law.n)) ** law.n;
  const reynolds = (15.467 * velocity * idIn * rho) / viscosity;
  const f = friction(reynolds, law.n, 16);
  return {
    velocity,
    viscosity,
    reynolds,
    frictionFactor: f,
    pressureLoss: ((f * velocity ** 2 * rho) / (92916 * idIn)) * lengthFt,
    regime: flowRegime(reynolds),
  };
}

/** Pressure loss in an annular interval between the hole (or casing) and the string. */
export function annulusPressureLoss(input: {
  flowGpm: number;
  holeIn: number;
  pipeIn: number;
  lengthFt: number;
  densityPpg: number;
  law: PowerLawConstants;
}): SegmentResult {
  const { flowGpm: q, holeIn, pipeIn, lengthFt, densityPpg: rho, law } = input;
  const gap = holeIn - pipeIn;
  const velocity = (24.48 * q) / (holeIn ** 2 - pipeIn ** 2);
  const viscosity =
    100 *
    law.k *
    ((2.4 * velocity) / gap) ** (law.n - 1) *
    ((2 * law.n + 1) / (3 * law.n)) ** law.n;
  const reynolds = (15.467 * velocity * gap * rho) / viscosity;
  const f = friction(reynolds, law.n, 24);
  return {
    velocity,
    viscosity,
    reynolds,
    frictionFactor: f,
    pressureLoss: ((f * velocity ** 2 * rho) / (92916 * gap)) * lengthFt,
    regime: flowRegime(reynolds),
  };
}

export type BitType = 'roller_cone' | 'pdc';

/** Pressure loss across the bit, psi. Roller cone: nozzle sizes in 32nds; PDC: TFA in in². */
export function bitPressureLoss(input: {
  type: BitType;
  flowGpm: number;
  densityPpg: number;
  nozzles32: readonly number[];
  tfaIn2: number;
}): number {
  const { type, flowGpm: q, densityPpg: rho } = input;
  if (type === 'pdc') return (rho * q ** 2) / (10858 * input.tfaIn2 ** 2);
  const sumSquares = input.nozzles32.reduce((sum, size) => sum + size ** 2, 0);
  return (156 * rho * q ** 2) / sumSquares ** 2;
}

export type BitHydraulics = {
  /** Hydraulic horsepower at the bit. */
  hhp: number;
  /** Hydraulic horsepower per square inch of bit area. */
  hsi: number;
  /** ft/s. */
  jetVelocity: number;
  /** lbf. */
  impactForce: number;
};

/** Bit hydraulics from the pressure loss and the nozzle sizes (analysis §8.5). */
export function bitHydraulics(input: {
  flowGpm: number;
  densityPpg: number;
  bitPressureLossPsi: number;
  bitSizeIn: number;
  nozzles32: readonly number[];
}): BitHydraulics {
  const { flowGpm: q, densityPpg: rho, bitPressureLossPsi, bitSizeIn } = input;
  // Decision v0.8.5 (defect 6 of the analysis): 1714 for the bit as for the system; the
  // workbook divided the bit horsepower by 1740.
  const hhp = (q * bitPressureLossPsi) / 1714;
  const sumSquares = input.nozzles32.reduce((sum, size) => sum + size ** 2, 0);
  const jetVelocity = (417.2 * q) / sumSquares;
  return {
    hhp,
    hsi: (1.27 * hhp) / bitSizeIn ** 2,
    jetVelocity,
    impactForce: (jetVelocity * q * rho) / 1930,
  };
}

/** System horsepower from the total pressure loss (analysis §8.5). */
export function systemHorsepower(totalPressurePsi: number, flowGpm: number): number {
  return (totalPressurePsi * flowGpm) / 1714;
}

/** Equivalent circulating density, ppg: MW + ΔP annulus / (0.052 × TVD in ft). */
export function ecd(mudWeightPpg: number, annulusLossPsi: number, tvdFt: number): number {
  return mudWeightPpg + annulusLossPsi / (0.052 * tvdFt);
}

/**
 * "Actual" mode: pipe and annulus losses are scaled so the total equals the measured
 * standpipe pressure: factor = (SPP − ΔPbit − ΔPtools) / (ΔPpipe + ΔPannulus).
 */
export function scaleToActual(input: {
  sppPsi: number;
  bitLossPsi: number;
  toolLossPsi: number;
  pipeLossPsi: number;
  annulusLossPsi: number;
}): number {
  const frictional = input.pipeLossPsi + input.annulusLossPsi;
  return frictional > 0 ? (input.sppPsi - input.bitLossPsi - input.toolLossPsi) / frictional : 1;
}
