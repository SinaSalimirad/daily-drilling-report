import { BBL_PER_M3, circleArea } from './geometry';

// Drill string volumes (workbook `DMR!BN20:CX30`, `BHA`; analysis §6.7).

export type StringComponent = {
  /** m. For the drill pipe (the first row) pass the result of `drillPipeLength`. */
  lengthM: number;
  odIn: number;
  idIn: number;
};

/**
 * Length of the drill pipe: it is not typed, it is the bit depth minus every other
 * component (`DMR!BK20`); zero while the others are as long as the hole.
 */
export function drillPipeLength(bitDepthM: number, otherLengthsM: readonly number[]): number {
  const others = otherLengthsM.reduce((sum, length) => sum + length, 0);
  return bitDepthM > others ? bitDepthM - others : 0;
}

/** Volume the inside of the component holds, m³ (`CU`). */
export function internalVolume({ lengthM, idIn }: StringComponent): number {
  return lengthM > 0 ? circleArea(idIn) * lengthM : 0;
}

/** Volume the outside of the component displaces if it is run closed, m³ (`CV`). */
function outsideVolume({ lengthM, odIn }: StringComponent): number {
  return lengthM > 0 ? circleArea(odIn) * lengthM : 0;
}

/** Steel of the component, m³: outside volume minus inside volume (`CT`). */
export function steelVolume(component: StringComponent): number {
  const steel = outsideVolume(component) - internalVolume(component);
  return steel > 0 ? steel : 0;
}

/** Steel plus capacity, m³ (`BZ`). */
export function closedDisplacement(component: StringComponent): number {
  return steelVolume(component) + internalVolume(component);
}

export type StringVolumes = {
  /** bbl. */
  steel: number;
  internal: number;
  closedDisplacement: number;
};

/** Sum over the components, bbl (`DMR!BN30`, `BO30`, `BP30`); each row is converted and rounded. */
export function stringVolumes(components: readonly StringComponent[]): StringVolumes {
  const bbl = (m3: number) => m3 * BBL_PER_M3;
  const sum = (pick: (c: StringComponent) => number) =>
    components.reduce((total, component) => total + bbl(pick(component)), 0);
  return {
    steel: sum(steelVolume),
    internal: sum(internalVolume),
    closedDisplacement: sum(closedDisplacement),
  };
}

export type NozzleGroup = {
  /** Nozzle size in 32nds of an inch. */
  size32: number;
  quantity: number;
};

/** Total flow area of the bit, in²: π/4 Σ (d/32)² × quantity, or a known TFA typed in (`BHA!G27`). */
export function totalFlowArea(nozzles: readonly NozzleGroup[], knownTfa?: number | null): number {
  if (knownTfa && knownTfa > 0) return knownTfa;
  return (
    (Math.PI / 4) *
    nozzles.reduce((sum, nozzle) => sum + (nozzle.size32 / 32) ** 2 * nozzle.quantity, 0)
  );
}
