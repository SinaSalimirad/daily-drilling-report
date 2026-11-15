import { z } from 'zod';
import { idSchema } from './base';
import { VOLUME_ITEMS, VOLUME_LOSS_ITEMS, type VolumeItem, type VolumeLossItem } from './enums';

// Pump readings, volume entries and the volume results of a report (workbook
// `DMR!V10:AO17`, `L61:Z81`, `MudPits(2)!O10:O26`). SI: m³, m³/s.

export const pumpReadingsPutSchema = z
  .object({
    readings: z
      .array(z.object({ pumpId: idSchema, spm: z.number().nonnegative().max(500) }).strict())
      .max(3),
  })
  .strict();
export type PumpReadingsPut = z.infer<typeof pumpReadingsPutSchema>;

export const pumpReadingsSchema = z.object({
  readings: z.array(z.object({ pumpId: idSchema, model: z.string(), spm: z.number() })),
});
export type PumpReadings = z.infer<typeof pumpReadingsSchema>;

const entryFields = Object.fromEntries(
  VOLUME_ITEMS.map((item) => [item, z.number().nonnegative().optional()]),
) as Record<VolumeItem, z.ZodOptional<z.ZodNumber>>;

/** `PUT` replaces the day's entries; an item left out is zero. Volumes in m³. */
export const volumeEntriesPutSchema = z
  .object({ entries: z.object(entryFields).strict() })
  .strict();
export type VolumeEntriesPut = z.infer<typeof volumeEntriesPutSchema>;

const volume = z.number();
const lossShape = Object.fromEntries(VOLUME_LOSS_ITEMS.map((item) => [item, volume])) as Record<
  VolumeLossItem,
  typeof volume
>;

/** One column of the accounting table (daily, section or well), m³. */
export const accountingColumnSchema = z.object({
  start: volume,
  water: volume,
  chemical: volume,
  diesel: volume,
  received: volume,
  returned: volume,
  built: volume,
  losses: z.object(lossShape),
  totalLosses: volume,
  end: volume,
});
export type AccountingColumnResult = z.infer<typeof accountingColumnSchema>;

export const volumesResultSchema = z.object({
  /** Mud-volume block of the DMR (workbook V10:AB15), m³. */
  block: z.object({
    hole: volume,
    string: volume,
    annulus: volume,
    belowBit: volume,
    active: volume,
    reserve: volume,
    totalCirculating: volume,
    /** Σ gal/stroke × SPM, m³/s; null without pump readings. */
    flowRate: z.number().nullable(),
    bottomsUpMinutes: z.number().nullable(),
    bottomsUpStrokes: z.number().nullable(),
    circulationMinutes: z.number().nullable(),
    /** Length drilled today, m, and the volume of that hole, m³. */
    dailyDrilled: z.number(),
    drilledVolume: z.number(),
  }),
  accounting: z.object({
    daily: accountingColumnSchema,
    section: accountingColumnSchema,
    well: accountingColumnSchema,
  }),
  /** End volume − (hole + active + reserve), m³; zero when the books balance. */
  balance: volume,
  /** Entries of the day, m³ (zero when left out). */
  entries: z.object(
    Object.fromEntries(VOLUME_ITEMS.map((item) => [item, volume])) as Record<
      VolumeItem,
      typeof volume
    >,
  ),
});
export type VolumesResult = z.infer<typeof volumesResultSchema>;
