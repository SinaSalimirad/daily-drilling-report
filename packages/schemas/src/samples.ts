import { z } from 'zod';
import { idSchema } from './base';

// Mud samples of a report (workbook `DMR!L20:Z48`, up to 3 columns; docs/03 allows more).
// SI at rest: °C, m, kg/m³, Pa. Dial readings, percentages, pH and funnel seconds as typed.
// What the engines read is a typed column; the rest of the template of the mud system goes
// to `otherProperties`.

export const MAX_SAMPLES = 6;

const reading = z.number().nonnegative().nullable().optional();

export const mudSampleInputSchema = z
  .object({
    sampleSourceId: idSchema.nullable().optional(),
    /** `HH:MM`. */
    sampleTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM')
      .nullable()
      .optional(),
    /** °C. */
    flowlineTemp: z.number().nullable().optional(),
    /** m. */
    depth: reading,
    /** kg/m³. */
    mudWeight: z.number().positive().nullable().optional(),
    /** °C. */
    mudTemp: z.number().nullable().optional(),
    /** Marsh funnel, seconds (per quart). */
    funnelViscosity: reading,
    /** °C. */
    rheologyTemp: z.number().nullable().optional(),
    r600: reading,
    r300: reading,
    r200: reading,
    r100: reading,
    r6: reading,
    r3: reading,
    /** Pa. */
    gel10s: reading,
    gel10m: reading,
    gel30m: reading,
    /** mL per 30 min. */
    apiFluidLoss: reading,
    /** % by volume. */
    oil: reading,
    water: reading,
    solids: reading,
    sand: reading,
    /** kg/m³ (workbook lb/bbl). */
    mbt: reading,
    /** kg/m³ (workbook mg/L). */
    chlorides: reading,
    /** pH, alkalinities, hardness, KCl, glycol, … of the template of the mud system. */
    otherProperties: z
      .record(z.string().max(40), z.union([z.number(), z.string().max(80)]))
      .optional(),
  })
  .strict();
export type MudSampleInput = z.infer<typeof mudSampleInputSchema>;

export const samplesPutSchema = z
  .object({ samples: z.array(mudSampleInputSchema).max(MAX_SAMPLES) })
  .strict();
export type SamplesPut = z.infer<typeof samplesPutSchema>;

const nullableNumber = z.number().nullable();

export const mudSampleSchema = z.object({
  id: idSchema,
  seq: z.number().int(),
  sampleSourceId: idSchema.nullable(),
  sampleTime: z.string().nullable(),
  flowlineTemp: nullableNumber,
  depth: nullableNumber,
  mudWeight: nullableNumber,
  mudTemp: nullableNumber,
  funnelViscosity: nullableNumber,
  rheologyTemp: nullableNumber,
  r600: nullableNumber,
  r300: nullableNumber,
  r200: nullableNumber,
  r100: nullableNumber,
  r6: nullableNumber,
  r3: nullableNumber,
  gel10s: nullableNumber,
  gel10m: nullableNumber,
  gel30m: nullableNumber,
  apiFluidLoss: nullableNumber,
  oil: nullableNumber,
  water: nullableNumber,
  solids: nullableNumber,
  sand: nullableNumber,
  mbt: nullableNumber,
  chlorides: nullableNumber,
  otherProperties: z.record(z.string(), z.union([z.number(), z.string()])),
  /** Derived (never stored): PV in Pa·s and YP in Pa from the dial readings. */
  plasticViscosity: nullableNumber,
  yieldPoint: nullableNumber,
});
export type MudSample = z.infer<typeof mudSampleSchema>;

const powerLaw = z.object({ n: z.number(), k: z.number() }).nullable();

export const samplesResultSchema = z.object({
  samples: z.array(mudSampleSchema),
  /** Results of the latest sample with data (workbook: the last filled column). */
  latest: z
    .object({
      seq: z.number().int(),
      pipe: powerLaw,
      annulus: powerLaw,
      /** Brine specific gravity and NaCl % by weight from the chlorides. */
      brineDensity: nullableNumber,
      naclPercent: nullableNumber,
    })
    .nullable(),
  /** Plan of the section against the latest sample. */
  plan: z.object({
    planned: z.object({
      mudWeight: nullableNumber,
      yieldPoint: nullableNumber,
      fluidLoss: nullableNumber,
    }),
    actual: z.object({
      mudWeight: nullableNumber,
      yieldPoint: nullableNumber,
      fluidLoss: nullableNumber,
    }),
  }),
});
export type SamplesResult = z.infer<typeof samplesResultSchema>;
