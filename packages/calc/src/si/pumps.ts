import type { PumpType } from '@ddr/schemas';
import { pumpOutputPerStroke } from '../engines/pumps';
import { fromSI, toSI } from '../units';

// SI adapter (docs/08 rule 2): SI in → oilfield → engine → SI out.

export type PumpSI = {
  /** Liner diameter, m. */
  linerDiameter: number;
  /** Stroke length, m. */
  strokeLength: number;
  /** Volumetric efficiency, % (dimensionless, stored as typed; docs/03). */
  efficiency: number;
  type: PumpType;
};

/** Pump output per stroke, m³. */
export function pumpOutputPerStrokeSI({
  linerDiameter,
  strokeLength,
  efficiency,
  type,
}: PumpSI): number {
  const gallons = pumpOutputPerStroke({
    linerIn: fromSI(linerDiameter, 'in'),
    strokeIn: fromSI(strokeLength, 'in'),
    efficiencyPct: efficiency,
    type,
  });
  return toSI(gallons, 'gal');
}
