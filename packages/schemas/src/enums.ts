import { z } from 'zod';

// Closed lists from the analysed workbook (docs/DMR_Workbook_Analysis.md §5.6, §6.1),
// as lower snake_case strings (docs/04). Open lists (activities, fluid systems, sample
// sources) are lookup tables instead (docs/03).

export const PRODUCT_UNITS = ['kg', 'lb', 't', 'gal', 'l', 'm3', 'bbl'] as const;
export const productUnitSchema = z.enum(PRODUCT_UNITS);
export type ProductUnit = z.infer<typeof productUnitSchema>;

/** Workbook F / L. */
export const PRODUCT_ORIGINS = ['foreign', 'local'] as const;
export const productOriginSchema = z.enum(PRODUCT_ORIGINS);
export type ProductOrigin = z.infer<typeof productOriginSchema>;

export const PIT_TYPES = ['active', 'reserve', 'not_mud'] as const;
export const pitTypeSchema = z.enum(PIT_TYPES);
export type PitType = z.infer<typeof pitTypeSchema>;

export const SECTION_TYPES = ['conductor', 'casing', 'liner', 'open_hole'] as const;
export const sectionTypeSchema = z.enum(SECTION_TYPES);
export type SectionType = z.infer<typeof sectionTypeSchema>;

export const WELL_TYPES = ['vertical', 'directional'] as const;
export const wellTypeSchema = z.enum(WELL_TYPES);
export type WellType = z.infer<typeof wellTypeSchema>;

export const WELL_DESIGNATIONS = [
  'development',
  'gas_injection',
  'key_well',
  'appraisal',
  'water_injection',
  'water_disposal',
  'exploration',
  'cuttings_reinjection',
  'workover',
  'repairing',
  're_entry',
  'new_leg',
  'perforation',
  'plugging',
] as const;
export const wellDesignationSchema = z.enum(WELL_DESIGNATIONS);
export type WellDesignation = z.infer<typeof wellDesignationSchema>;

export const RIG_TYPES = ['onshore', 'offshore'] as const;
export const rigTypeSchema = z.enum(RIG_TYPES);
export type RigType = z.infer<typeof rigTypeSchema>;

export const PUMP_TYPES = ['duplex', 'triplex'] as const;
export const pumpTypeSchema = z.enum(PUMP_TYPES);
export type PumpType = z.infer<typeof pumpTypeSchema>;

/** Water-based mud, oil-based mud (from v1.3.0), brine. */
export const FLUID_TYPES = ['wbm', 'obm', 'brine'] as const;
export const fluidTypeSchema = z.enum(FLUID_TYPES);
export type FluidType = z.infer<typeof fluidTypeSchema>;

export const REPORT_STATUSES = ['draft', 'submitted'] as const;
export const reportStatusSchema = z.enum(REPORT_STATUSES);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

/** Daily input items of the mud-volume accounting (workbook `MudPits(2)!O10:O24`; docs/03). */
export const VOLUME_INPUT_ITEMS = ['water', 'diesel', 'received', 'return'] as const;
export const VOLUME_LOSS_ITEMS = [
  'dumped',
  'shakers',
  'evaporation',
  'super_clone',
  'trip_loss',
  'desander_desilter',
  'pit_cleaning',
  'other',
  'formation',
  'left_in_hole',
] as const;
export const VOLUME_ITEMS = [...VOLUME_INPUT_ITEMS, ...VOLUME_LOSS_ITEMS] as const;
export const volumeItemSchema = z.enum(VOLUME_ITEMS);
export type VolumeItem = z.infer<typeof volumeItemSchema>;
export type VolumeLossItem = (typeof VOLUME_LOSS_ITEMS)[number];
