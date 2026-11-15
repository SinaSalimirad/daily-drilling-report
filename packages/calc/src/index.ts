// Pure calculation engines (docs/08). No I/O, no imports from the apps.
// `engines/*` work in oilfield units with workbook constants; `si/*` are the SI
// adapters used by the API and the web app.

/** Stored with every result snapshot; bump whenever an output can change. */
export const ENGINE_VERSION = '0.8.0';

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
export { isRecognisedTool, needsToolPressureLoss } from './engines/bha';
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
  angleFactor,
  type CleaningInput,
  type CleaningResult,
  type CleaningVerdict,
  holeCleaning,
  slipVelocity,
} from './engines/hole-cleaning';
export {
  annulusPressureLoss,
  type BitHydraulics,
  type BitType,
  bitHydraulics,
  bitPressureLoss,
  ecd,
  flowRegime,
  type PowerLawConstants,
  pipePressureLoss,
  type SegmentResult,
  scaleToActual,
  systemHorsepower,
} from './engines/hydraulics';
export {
  chemicalVolume,
  costOf,
  finalStock,
  type ProductPackage,
  stockMass,
} from './engines/inventory';
export { pumpOutputPerStroke } from './engines/pumps';
export {
  type PowerLaw,
  plasticViscosity,
  powerLawAnnulus,
  powerLawPipe,
  yieldPoint,
} from './engines/rheology';
export { brineDensityFromChlorides, naclWeightPercent } from './engines/salt';
export {
  bentoniteContent,
  massConcentration,
  type SolidsInput,
  type SolidsResult,
  solidsAnalysisUnweighted,
  solidsAnalysisWeighted,
} from './engines/solids';
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
export { inclinationAtDepth, type Station, tvdAtDepth, tvdFromSurvey } from './engines/survey';
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
