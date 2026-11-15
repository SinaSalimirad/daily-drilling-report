import type { PumpType } from '@ddr/schemas';

// Oilfield layer (docs/08 rule 2): inches, percent, US gallons, workbook constants.
// Workbook PEquip / DMR!BP37:BP39 (analysis §6.2):
//   gal/stroke = π/4 × (liner_in × 0.0254)² × (stroke_in × 0.0254) × N × eff% × 10 × 0.264172
//   N = 3 for Triplex, 2 for Duplex

const CYLINDERS: Record<PumpType, number> = { triplex: 3, duplex: 2 };

/** US gallons per litre as written in the workbook cell (exact: 0.264172052…). With eff% × 10
 * it turns m³ into gallons: eff% / 100 × 1000 L/m³ = eff% × 10. */
const WORKBOOK_GAL_FACTOR = 0.264172;

export type PumpOilfield = {
  /** Liner diameter, in. */
  linerIn: number;
  /** Stroke length, in. */
  strokeIn: number;
  /** Volumetric efficiency, % (e.g. 95). */
  efficiencyPct: number;
  type: PumpType;
};

/** Pump output per stroke, US gal. */
export function pumpOutputPerStroke({
  linerIn,
  strokeIn,
  efficiencyPct,
  type,
}: PumpOilfield): number {
  const linerM = linerIn * 0.0254;
  const strokeM = strokeIn * 0.0254;
  return (
    (Math.PI / 4) *
    linerM ** 2 *
    strokeM *
    CYLINDERS[type] *
    efficiencyPct *
    10 *
    WORKBOOK_GAL_FACTOR
  );
}
