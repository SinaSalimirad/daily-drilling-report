// Quantities and the units each can be displayed in (docs/03 "Units at rest",
// docs/08 "Exact conversion factors"). Names only: the factors live in
// @ddr/calc/units. Values are stored in SI; the first unit of each list is the
// SI (or SI-family) unit offered by the `si` preset.

export const QUANTITY_UNITS = {
  depth: ['m', 'ft'],
  diameter: ['mm', 'm', 'in'],
  cakeThickness: ['mm', 'in_32'],
  volume: ['m3', 'bbl', 'gal'],
  density: ['kg_m3', 'sg', 'ppg', 'pcf'],
  pressure: ['kpa', 'pa', 'bar', 'psi'],
  yieldStress: ['pa', 'lbf_100ft2'],
  flowRate: ['l_min', 'm3_min', 'm3_s', 'gpm'],
  plasticViscosity: ['mpa_s', 'pa_s', 'cp'],
  concentration: ['kg_m3', 'lb_bbl'],
  chlorides: ['mg_l', 'kg_m3'],
  mass: ['kg', 't', 'lb'],
  rop: ['m_h', 'm_s', 'ft_h'],
  temperature: ['degc', 'degf'],
} as const;

export type Quantity = keyof typeof QUANTITY_UNITS;
export type UnitOf<Q extends Quantity> = (typeof QUANTITY_UNITS)[Q][number];
export type UnitId = UnitOf<Quantity>;

/** The display unit chosen for each quantity; a setting of the project (docs/03). */
export type UnitSystem = { [Q in Quantity]: UnitOf<Q> };

export const QUANTITIES = Object.keys(QUANTITY_UNITS) as Quantity[];
