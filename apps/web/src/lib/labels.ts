import type { Quantity } from '@ddr/schemas';

// User-facing names (English; kept out of deep logic so a second language can be added).

export const QUANTITY_LABELS: Record<Quantity, string> = {
  depth: 'Depth, length',
  diameter: 'Diameter',
  cakeThickness: 'Cake thickness',
  volume: 'Volume',
  density: 'Mud weight',
  pressure: 'Pressure',
  yieldStress: 'Yield point, gels',
  flowRate: 'Flow rate',
  plasticViscosity: 'Plastic viscosity',
  concentration: 'Concentration',
  chlorides: 'Chlorides',
  mass: 'Mass',
  rop: 'Rate of penetration',
  temperature: 'Temperature',
};

/** `gas_injection` → `Gas injection`. */
export function enumLabel(value: string): string {
  const text = value.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
