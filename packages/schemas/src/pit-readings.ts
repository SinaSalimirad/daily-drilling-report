import { z } from 'zod';
import { idSchema } from './base';
import { pitTypeSchema } from './enums';

// Daily status of the pits of a report (workbook MudPits(2) E8:K27). SI: m³, kg/m³.

export const pitReadingInputSchema = z
  .object({
    pitId: idSchema,
    pitType: pitTypeSchema,
    /** m³; at most the capacity of the pit (checked by the service). */
    volume: z.number().nonnegative(),
    /** kg/m³; 0.5–2.6 × water density when sent. */
    mudWeight: z.number().positive().nullable().optional(),
    /** Lookup `pit_mud_types`. */
    mudTypeId: idSchema.nullable().optional(),
  })
  .strict();
export type PitReadingInput = z.infer<typeof pitReadingInputSchema>;

/** `PUT` replaces the whole set of readings of the report. */
export const pitReadingsPutSchema = z
  .object({ readings: z.array(pitReadingInputSchema).max(40) })
  .strict();
export type PitReadingsPut = z.infer<typeof pitReadingsPutSchema>;

export const pitReadingSchema = z.object({
  id: idSchema,
  pitId: idSchema,
  pitName: z.string(),
  pitType: pitTypeSchema,
  volume: z.number(),
  mudWeight: z.number().nullable(),
  mudTypeId: idSchema.nullable(),
});

export const pitReadingsSchema = z.object({
  readings: z.array(pitReadingSchema),
  /** Volume per pit type (workbook U23:U25), m³. */
  totals: z.object({ active: z.number(), reserve: z.number(), notMud: z.number() }),
});
export type PitReadings = z.infer<typeof pitReadingsSchema>;
