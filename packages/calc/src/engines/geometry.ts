import type { SectionType } from '@ddr/schemas';

// Wellbore geometry (workbook `DMR!CE5:CQ30`, `WBG`; analysis §6.6). Oilfield layer:
// inches for diameters, metres for depths, barrels for the result.

/** WORKBOOK-ROUNDING: workbook constant, bbl per m³. */
export const BBL_PER_M3 = 6.29;

/** `precision as displayed`: the workbook stores each cell rounded to its format. */
export const roundTo = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/** Cross-section of a circle of the given diameter in inches, m². */
export const circleArea = (diameterIn: number) => (diameterIn * 0.0254) ** 2 * (Math.PI / 4);

export type HoleSection = {
  type: SectionType;
  /** m. */
  topM: number;
  /** m; 0 means "to the depth asked for" (workbook `CH20`). */
  bottomM: number;
  /** Inside diameter of casing / liner, or bit diameter of an open hole, in. */
  idIn: number;
};

/** Volume of a hole interval, m³, rounded to the 2 decimals the workbook displays. */
export function sectionVolume(idIn: number, lengthM: number): number {
  // WORKBOOK-ROUNDING: 2 decimals (CI20 shows 86.06, and 86.06 × 6.29 = 541.32).
  return roundTo(circleArea(idIn) * lengthM, 2);
}

/** Calculation depth: the workbook computes the hole twice, with different roundings. */
export type DepthMode = 'bit' | 'td';

/**
 * Hole volume down to a depth, bbl, as the workbook's per-section table does it
 * (`CE:CP` for the bit depth, rows 20–29 for TD). The next section decides what a section
 * contributes: nothing or an open hole below it → its own interval; a liner below → down
 * to the liner top; a casing below → zero.
 */
export function holeVolumeAtDepth(
  sections: readonly HoleSection[],
  depthM: number,
  mode: DepthMode,
): number {
  return roundTo(
    holeVolumesBySection(sections, depthM, mode).reduce((sum, volume) => sum + volume, 0),
    2,
  );
}

/** The contribution of each section to the hole volume, bbl (`DMR!BQ5:BQ14`, `BR5:BR14`). */
export function holeVolumesBySection(
  sections: readonly HoleSection[],
  depthM: number,
  mode: DepthMode,
): number[] {
  // WORKBOOK-ROUNDING: the ID cell is shown with 2 decimals in the bit-depth table
  // (8.625 → 8.63) and 3 decimals in the TD table.
  const idDecimals = mode === 'bit' ? 2 : 3;
  const rows = sections.map((section, index) => {
    const previousBottom = sections[index - 1]?.bottomM ?? 0;
    const isOpen = section.type === 'open_hole';
    const bottom =
      mode === 'bit'
        ? Math.min(section.bottomM, depthM)
        : section.bottomM === 0
          ? depthM
          : section.bottomM;
    const rawTop = isOpen ? previousBottom : Math.min(section.topM, bottom);
    const top = mode === 'bit' ? Math.min(rawTop, depthM) : rawTop;
    const length = mode === 'bit' && isOpen ? depthM - top : bottom - top;
    const id = roundTo(section.idIn, idDecimals);
    return { section, top, id, interval: sectionVolume(id, length) };
  });

  return rows.map((row, index) => {
    const next = rows[index + 1];
    let volume: number;
    if (!next || next.section.type === 'open_hole') volume = row.interval;
    else if (next.section.type === 'liner') volume = sectionVolume(row.id, next.top - row.top);
    // WORKBOOK-QUIRK: a casing below contributes nothing (`CO20 = IF(CJ21=2, 0, 0)`).
    else volume = 0;
    return roundTo(volume * BBL_PER_M3, 2);
  });
}

/** Total hole volume at TD, bbl (`DMR!BR15`). */
export function totalHoleVolume(sections: readonly HoleSection[], tdM: number): number {
  return holeVolumeAtDepth(sections, tdM, 'td');
}

/**
 * Volume-weighted average hole diameter, in (`WBG!M18`): sections with a volume of zero or
 * less (an open hole above its top) weigh in with a diameter of 0.
 */
export function averageHoleDiameter(sections: readonly HoleSection[], tdM: number): number {
  const volumes = holeVolumesBySection(sections, tdM, 'td');
  const total = volumes.reduce((sum, volume) => sum + volume, 0);
  if (total <= 0) return 0;
  const weighted = volumes.reduce(
    (sum, volume, index) => sum + volume * (volume > 0 ? (sections[index]?.idIn ?? 0) : 0),
    0,
  );
  return roundTo(weighted / total, 2);
}
