import type { ProductUnit } from '@ddr/schemas';

// Master data of the analysed workbook, report 1 (`DMR-SAVA-001, PYW-24ST1, RIG GPTK-G2,
// 2026.07.28.xlsm`), in the workbook's own units. The seed converts to SI with
// @ddr/calc/units. Source cells are named next to each block.

/** GData!D4:D12, K1800 (rig type radio: 1 = onshore). Units I4:I11 = the workbook preset. */
export const DEMO_PROJECT = {
  name: 'SAVA',
  operator: 'KKC',
  contractor: 'GPTK',
  rigName: 'GPTK G2',
  fieldCountry: 'West Paydar',
  currency: '€',
} as const;

export const DEMO_WELL = {
  name: 'PYW-24ST1',
  designation: 're_entry',
  wellType: 'directional',
  rigType: 'onshore',
  spudDate: '2026-07-28',
} as const;

/** MudPits!C7:D14 — name, capacity in bbl. */
export const DEMO_PITS_BBL: readonly [name: string, capacityBbl: number][] = [
  ['Suction 1', 480],
  ['Suction 2', 480],
  ['Reserve 1', 210],
  ['Reserve 2', 140],
  ['Reserve 3', 140],
  ['Middle', 480],
  ['Desander', 210],
  ['Trip Tank', 100],
];

/** PEquip!C7:I9 — stroke and liner in inches, efficiency in %. Workbook output: 4.19, 4.19, 4.91 gal. */
export const DEMO_PUMPS = [
  { model: 'FH 1500', type: 'triplex', strokeIn: 12, efficiencyPct: 95, linerIn: 6 },
  { model: 'FH 1500', type: 'triplex', strokeIn: 12, efficiencyPct: 95, linerIn: 6 },
  { model: 'FH 1500', type: 'triplex', strokeIn: 12, efficiencyPct: 95, linerIn: 6.5 },
] as const;

/** SCE!C7:I9. */
export const DEMO_SCE_UNITS = [1, 2, 3].map((unitNumber) => ({
  type: 'Shaker',
  unitNumber,
  manufacturer: 'Swaco',
  screenSize: '170/170/170/170',
}));

/**
 * PList!C6:G30 — 25 of the 28 products. Left out: "Mud Skid" and the two "Tarpaulin"
 * rows, which have no numeric package size (docs/known-issues.md KI-001, #95). The
 * workbook has no unit prices (KI-002, #96), so the seed builds no price list.
 */
export const DEMO_PRODUCTS: readonly {
  name: string;
  packageSize: number;
  packageUnit: ProductUnit;
  specificGravity: number;
}[] = [
  { name: 'Barite', packageSize: 1.5, packageUnit: 't', specificGravity: 4.2 },
  { name: 'Bio Cide', packageSize: 55, packageUnit: 'gal', specificGravity: 1.1 },
  { name: 'Caustic Soda', packageSize: 25, packageUnit: 'kg', specificGravity: 1.1 },
  { name: 'Citric Acid', packageSize: 25, packageUnit: 'kg', specificGravity: 1.542 },
  { name: 'Defomer', packageSize: 55, packageUnit: 'gal', specificGravity: 0.95 },
  { name: 'Drilling Detergent', packageSize: 55, packageUnit: 'gal', specificGravity: 1.01 },
  { name: 'Hematite', packageSize: 1.5, packageUnit: 't', specificGravity: 4.7 },
  { name: 'H2S Scav (Zinc Carbonate)', packageSize: 25, packageUnit: 'kg', specificGravity: 1.1 },
  { name: 'Kwick seal F', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Kwick seal M', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Kwick seal C', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Lime', packageSize: 25, packageUnit: 'kg', specificGravity: 2.34 },
  { name: 'Lignosulfonate', packageSize: 25, packageUnit: 'kg', specificGravity: 2.2 },
  { name: 'Mica F', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Mica M', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Mica C', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Nut Plug F', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Nut Plug M', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Nut Plug C', packageSize: 25, packageUnit: 'kg', specificGravity: 1.11 },
  { name: 'Pipe LAX NW', packageSize: 55, packageUnit: 'gal', specificGravity: 0.9 },
  { name: 'Soda Ash', packageSize: 50, packageUnit: 'kg', specificGravity: 2.53 },
  { name: 'Sodium Bicarbonate', packageSize: 25, packageUnit: 'kg', specificGravity: 2.16 },
  { name: 'Starch HT', packageSize: 25, packageUnit: 'kg', specificGravity: 1.5 },
  { name: 'Sodium Chloride (Salt)', packageSize: 1, packageUnit: 't', specificGravity: 2.7 },
  { name: 'Xanthan Gum', packageSize: 25, packageUnit: 'kg', specificGravity: 1.5 },
];
