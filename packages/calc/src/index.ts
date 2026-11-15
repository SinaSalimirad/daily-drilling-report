// Pure calculation engines (docs/08). No I/O, no imports from the apps.
// `engines/*` work in oilfield units with workbook constants; `si/*` are the SI
// adapters used by the API and the web app.

/** Stored with every result snapshot; bump whenever an output can change. */
export const ENGINE_VERSION = '0.0.0';

export {
  type AccountingColumn,
  type AccountingEntries,
  balanceCheck,
  builtVolume,
  chemicalVolumeBbl,
  endVolume,
  periodColumn,
  totalLosses,
} from './engines/accounting';
export {
  averageHoleDiameter,
  BBL_PER_M3,
  type DepthMode,
  type HoleSection,
  holeVolumeAtDepth,
  holeVolumesBySection,
  roundTo,
  sectionVolume,
  totalHoleVolume,
} from './engines/geometry';
export {
  chemicalVolume,
  costOf,
  finalStock,
  type ProductPackage,
  stockMass,
} from './engines/inventory';
export { pumpOutputPerStroke } from './engines/pumps';
export {
  closedDisplacement,
  drillPipeLength,
  internalVolume,
  type NozzleGroup,
  type StringComponent,
  type StringVolumes,
  steelVolume,
  stringVolumes,
  totalFlowArea,
} from './engines/string';
export {
  bottomsUp,
  circulationTime,
  drilledVolume,
  flowRate,
  flowRateExact,
  type HoleStringAnnulus,
  type HoleVolumeInput,
  holeStringAnnulus,
  type PumpStroke,
  pitTonnage,
  totalCirculatingVolume,
} from './engines/volumes';
export {
  averageHoleDiameterSI,
  type HoleSectionSI,
  holeVolumeAtDepthSI,
  toOilfield,
  totalHoleVolumeSI,
} from './si/geometry';
export { pumpOutputPerStrokeSI } from './si/pumps';
