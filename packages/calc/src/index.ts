// Pure calculation engines (docs/08). No I/O, no imports from the apps.
// `engines/*` work in oilfield units with workbook constants; `si/*` are the SI
// adapters used by the API and the web app.

/** Stored with every result snapshot; bump whenever an output can change. */
export const ENGINE_VERSION = '0.0.0';

export {
  chemicalVolume,
  costOf,
  finalStock,
  type ProductPackage,
  stockMass,
} from './engines/inventory';
export { pumpOutputPerStroke } from './engines/pumps';
export { pumpOutputPerStrokeSI } from './si/pumps';
