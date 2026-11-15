import type { SectionType } from '@ddr/schemas';

// Wellbore geometry (workbook `DMR!CE5:CQ30`, `WBG`; analysis §6.6). Oilfield layer:
// inches for diameters, metres for depths, barrels for the result.

/** Barrels per cubic metre: the exact factor of docs/08 (the workbook used 6.29; v0.8.5). */
export const BBL_PER_M3 = 1 / 0.158987294928;

/**
 * Rounding for display and for cleaning binary noise only. The engines never round: the
 * new system rounds when it shows a number (decision of v0.8.5; the workbook rounded
 * every cell "as displayed").
 */
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

/** Volume of a hole interval, m³. */
export function sectionVolume(idIn: number, lengthM: number): number {
  return circleArea(idIn) * lengthM;
}

/** Calculation depth: down to the bit (the open hole stops at the bit) or down to TD. */
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
  return holeVolumesBySection(sections, depthM, mode).reduce((sum, volume) => sum + volume, 0);
}

/** The contribution of each section to the hole volume, bbl (`DMR!BQ5:BQ14`, `BR5:BR14`). */
export function holeVolumesBySection(
  sections: readonly HoleSection[],
  depthM: number,
  mode: DepthMode,
): number[] {
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
    const id = section.idIn;
    return { section, top, id, interval: sectionVolume(id, length) };
  });

  return rows.map((row, index) => {
    const next = rows[index + 1];
    let volume: number;
    if (!next || next.section.type === 'open_hole') volume = row.interval;
    else if (next.section.type === 'liner') volume = sectionVolume(row.id, next.top - row.top);
    // Decision v0.8.5 (kept): a casing below a casing contributes nothing, as in the workbook
    // (`CO20 = IF(CJ21=2, 0, 0)`); a string of casing inside another is not a hole interval.
    else volume = 0;
    return volume * BBL_PER_M3;
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
  return weighted / total;
}
