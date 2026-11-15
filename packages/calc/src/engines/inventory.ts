import type { ProductUnit } from '@ddr/schemas';

// Oilfield layer of the chemical inventory (workbook `Chem Inv.`, analysis §7.2).
// Quantities of stock are counts of packages; a package has a size in its own unit.

/** Final stock = initial + received − used (`Chem Inv.!O`). A negative `received` is a return. */
export function finalStock({
  initial,
  received,
  used,
}: {
  initial: number;
  received: number;
  used: number;
}): number {
  return initial + received - used;
}

export type ProductPackage = {
  unit: ProductUnit;
  /** Package size in `unit`. */
  size: number;
  /** Specific gravity; needed for mass units (kg, lb, t) and ignored for volume units. */
  specificGravity: number | null;
};

// Exact factors of docs/08 (decision v0.8.5; the workbook used 2204, 3.785 and 6.29).
const LB_PER_TONNE = 2204.62262185;
const LITRES_PER_GAL = 3.785411784;
const BBL_PER_M3 = 1 / 0.158987294928;

/**
 * Volume of a quantity of packages, m³ (`Chem Inv.!AB:AI`). Mass units need the specific
 * gravity; without it the volume is unknown and the result is null.
 */
export function chemicalVolume(pkg: ProductPackage, packages: number): number | null {
  const { unit, size, specificGravity: sg } = pkg;
  switch (unit) {
    case 'kg':
      return sg ? ((size / sg) * packages) / 1000 : null;
    case 'lb':
      return sg ? ((size / sg) * packages) / LB_PER_TONNE : null;
    case 't':
      return sg ? (size / sg) * packages : null;
    case 'gal':
      return (size * packages * LITRES_PER_GAL) / 1000;
    case 'l':
      return (size * packages) / 1000;
    case 'm3':
      return size * packages;
    case 'bbl':
      return (size * packages) / BBL_PER_M3;
  }
}

/** Cost of the packages used at a price per package (`Chem Inv.!P`). */
export function costOf(used: number, unitPrice: number): number {
  return used * unitPrice;
}

/**
 * Mass of a quantity of packages, kg. Mass units are converted with the workbook's
 * constants; volume units go through the specific gravity (null without it).
 */
export function stockMass(pkg: ProductPackage, packages: number): number | null {
  const { unit, size, specificGravity: sg } = pkg;
  switch (unit) {
    case 'kg':
      return size * packages;
    case 'lb':
      return (size * packages * 1000) / LB_PER_TONNE;
    case 't':
      return size * packages * 1000;
    default: {
      const volume = chemicalVolume(pkg, packages);
      return volume === null || !sg ? null : volume * sg * 1000;
    }
  }
}
