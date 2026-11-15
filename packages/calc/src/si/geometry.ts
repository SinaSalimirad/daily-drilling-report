import type { SectionType } from '@ddr/schemas';
import {
  averageHoleDiameter,
  type DepthMode,
  type HoleSection,
  holeVolumeAtDepth,
  roundTo,
  totalHoleVolume,
} from '../engines/geometry';
import { fromSI, toSI } from '../units';

// SI adapter of the geometry engines (docs/08 rule 2): metres in, metres and m³ out.

export type HoleSectionSI = {
  type: SectionType;
  top: number;
  bottom: number;
  innerDiameter: number;
};

/** Sections in the engine's units. Diameters are cleaned to 6 decimals of an inch so the
 * metre → inch conversion cannot flip the workbook's "as displayed" rounding. */
export function toOilfield(sections: readonly HoleSectionSI[]): HoleSection[] {
  return sections.map((section) => ({
    type: section.type,
    topM: section.top,
    bottomM: section.bottom,
    idIn: roundTo(fromSI(section.innerDiameter, 'in'), 6),
  }));
}

/** Total hole volume down to TD, m³. */
export function totalHoleVolumeSI(sections: readonly HoleSectionSI[], td: number): number {
  return toSI(totalHoleVolume(toOilfield(sections), td), 'bbl');
}

/** Hole volume down to a depth, m³; `mode` picks the workbook's rounding of the ID. */
export function holeVolumeAtDepthSI(
  sections: readonly HoleSectionSI[],
  depth: number,
  mode: DepthMode,
): number {
  return toSI(holeVolumeAtDepth(toOilfield(sections), depth, mode), 'bbl');
}

/** Volume-weighted average hole diameter, m. */
export function averageHoleDiameterSI(sections: readonly HoleSectionSI[], td: number): number {
  return toSI(averageHoleDiameter(toOilfield(sections), td), 'in');
}
