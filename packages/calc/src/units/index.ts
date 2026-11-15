import type { Quantity, UnitId, UnitSystem } from '@ddr/schemas';

// The one place that knows conversion factors (docs/08-calculation-engine-spec.md).
// Values are stored in SI; convert at the edge only. No component, route or engine
// writes a factor of its own.

const LB = 0.45359237; // kg, exact by definition
const GAL = 0.003785411784; // m³ (US gallon), docs/08
const IN = 0.0254; // m, docs/08
const FT = 0.3048; // m, docs/08

type Dimension =
  | 'length'
  | 'volume'
  | 'massPerVolume'
  | 'pressure'
  | 'flowRate'
  | 'viscosity'
  | 'mass'
  | 'speed'
  | 'temperature';

type Unit = {
  dimension: Dimension;
  /** SI value = display value × factor (linear units). */
  factor: number;
  label: string;
};

/** Every unit of @ddr/schemas QUANTITY_UNITS; a missing one is a type error. */
export const UNITS: Record<UnitId, Unit> = {
  // length
  m: { dimension: 'length', factor: 1, label: 'm' },
  mm: { dimension: 'length', factor: 0.001, label: 'mm' },
  ft: { dimension: 'length', factor: FT, label: 'ft' },
  in: { dimension: 'length', factor: IN, label: 'in' },
  in_32: { dimension: 'length', factor: IN / 32, label: '1/32 in' },
  // volume
  m3: { dimension: 'volume', factor: 1, label: 'm³' },
  bbl: { dimension: 'volume', factor: 0.158987294928, label: 'bbl' },
  gal: { dimension: 'volume', factor: GAL, label: 'gal' },
  // density, concentration, chlorides (mass per volume)
  kg_m3: { dimension: 'massPerVolume', factor: 1, label: 'kg/m³' },
  sg: { dimension: 'massPerVolume', factor: 1000, label: 'SG' },
  ppg: { dimension: 'massPerVolume', factor: 119.8264273, label: 'ppg' },
  pcf: { dimension: 'massPerVolume', factor: 16.01846337396, label: 'PCF' },
  lb_bbl: { dimension: 'massPerVolume', factor: 2.853010174, label: 'lb/bbl' },
  mg_l: { dimension: 'massPerVolume', factor: 0.001, label: 'mg/L' },
  // pressure, yield point, gel strength
  pa: { dimension: 'pressure', factor: 1, label: 'Pa' },
  kpa: { dimension: 'pressure', factor: 1000, label: 'kPa' },
  bar: { dimension: 'pressure', factor: 100_000, label: 'bar' },
  psi: { dimension: 'pressure', factor: 6894.757293168, label: 'psi' },
  lbf_100ft2: { dimension: 'pressure', factor: 0.4788025898, label: 'lb/100 ft²' },
  // flow rate
  m3_s: { dimension: 'flowRate', factor: 1, label: 'm³/s' },
  m3_min: { dimension: 'flowRate', factor: 1 / 60, label: 'm³/min' },
  l_min: { dimension: 'flowRate', factor: 0.001 / 60, label: 'L/min' },
  gpm: { dimension: 'flowRate', factor: GAL / 60, label: 'gal/min' },
  // plastic viscosity
  pa_s: { dimension: 'viscosity', factor: 1, label: 'Pa·s' },
  mpa_s: { dimension: 'viscosity', factor: 0.001, label: 'mPa·s' },
  cp: { dimension: 'viscosity', factor: 0.001, label: 'cP' },
  // mass
  kg: { dimension: 'mass', factor: 1, label: 'kg' },
  t: { dimension: 'mass', factor: 1000, label: 'MT' },
  lb: { dimension: 'mass', factor: LB, label: 'lb' },
  // rate of penetration
  m_s: { dimension: 'speed', factor: 1, label: 'm/s' },
  m_h: { dimension: 'speed', factor: 1 / 3600, label: 'm/h' },
  ft_h: { dimension: 'speed', factor: FT / 3600, label: 'ft/h' },
  // temperature: °C is the stored unit (docs/03 accepted exception); °F has an offset
  degc: { dimension: 'temperature', factor: 1, label: '°C' },
  degf: { dimension: 'temperature', factor: 1 / 1.8, label: '°F' },
};

/** Display value → SI. */
export function toSI(value: number, unit: UnitId): number {
  if (unit === 'degf') return (value - 32) / 1.8;
  return value * UNITS[unit].factor;
}

/** SI → display value. */
export function fromSI(value: number, unit: UnitId): number {
  if (unit === 'degf') return value * 1.8 + 32;
  return value / UNITS[unit].factor;
}

/** Converts between two units of the same dimension; throws on a mismatch (a bug). */
export function convert(value: number, from: UnitId, to: UnitId): number {
  if (UNITS[from].dimension !== UNITS[to].dimension) {
    throw new Error(
      `Cannot convert ${from} (${UNITS[from].dimension}) to ${to} (${UNITS[to].dimension})`,
    );
  }
  return from === to ? value : fromSI(toSI(value, from), to);
}

export function unitLabel(unit: UnitId): string {
  return UNITS[unit].label;
}

/**
 * Unit-system presets. `si`: SI and SI-family units that read well (mm, kPa, L/min).
 * `workbook`: the analysed workbook (docs/03): bbl, PCF, psi, m, gal/min, lb/bbl, °F;
 * diameters in inches, cake in 1/32 in.
 */
export const UNIT_SYSTEM_PRESETS = {
  si: {
    depth: 'm',
    diameter: 'mm',
    cakeThickness: 'mm',
    volume: 'm3',
    density: 'kg_m3',
    pressure: 'kpa',
    yieldStress: 'pa',
    flowRate: 'l_min',
    plasticViscosity: 'mpa_s',
    concentration: 'kg_m3',
    chlorides: 'mg_l',
    mass: 'kg',
    rop: 'm_h',
    temperature: 'degc',
  },
  workbook: {
    depth: 'm',
    diameter: 'in',
    cakeThickness: 'in_32',
    volume: 'bbl',
    density: 'pcf',
    pressure: 'psi',
    yieldStress: 'lbf_100ft2',
    flowRate: 'gpm',
    plasticViscosity: 'cp',
    concentration: 'lb_bbl',
    chlorides: 'mg_l',
    mass: 'kg',
    rop: 'm_h',
    temperature: 'degf',
  },
} as const satisfies Record<string, UnitSystem>;

export type UnitSystemPreset = keyof typeof UNIT_SYSTEM_PRESETS;

/** Display unit of a quantity in a unit system. */
export function unitFor(system: UnitSystem, quantity: Quantity): UnitId {
  return system[quantity];
}
