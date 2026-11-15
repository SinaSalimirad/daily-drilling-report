import { z } from 'zod';

// Hydraulics and hole-cleaning results of a report (analysis §8.5, §8.6). SI: m, Pa, m/s,
// kg/m³, m³/s; horsepower and impact force in the workbook's hp and lbf.

const regime = z.enum(['laminar', 'transient', 'turbulent']);

const segment = z.object({
  name: z.string(),
  /** m. */
  length: z.number(),
  velocity: z.number(),
  /** Pa. */
  pressureLoss: z.number(),
  reynolds: z.number(),
  regime,
});

export const hydraulicsSchema = z.object({
  /** Why the block cannot be calculated yet; empty when it can. */
  missing: z.array(z.string()),
  mode: z.enum(['virtual', 'actual']),
  /** Scale applied to pipe and annulus losses in actual mode (1 in virtual mode). */
  scale: z.number(),
  /** m³/s. */
  flowRate: z.number().nullable(),
  pipe: z.array(segment.extend({ innerDiameter: z.number() })),
  annulus: z.array(
    segment.extend({
      holeDiameter: z.number(),
      pipeDiameter: z.number(),
      cleaning: z
        .object({
          slipVelocity: z.number(),
          transportEfficiency: z.number(),
          cuttingConcentration: z.number().nullable(),
          index: z.number().nullable(),
          verdict: z.enum(['V-Good', 'Good', 'OK', 'Poor', 'V-Poor']),
        })
        .nullable(),
    }),
  ),
  bit: z
    .object({
      pressureLoss: z.number(),
      hhp: z.number(),
      hsi: z.number(),
      jetVelocity: z.number(),
      /** lbf. */
      impactForce: z.number(),
    })
    .nullable(),
  totals: z.object({
    pipe: z.number(),
    annulus: z.number(),
    bit: z.number(),
    tools: z.number(),
    total: z.number(),
    /** Measured standpipe pressure, Pa. */
    measured: z.number().nullable(),
  }),
  systemHorsepower: z.number().nullable(),
  /** kg/m³, at TD. */
  ecd: z.number().nullable(),
});
export type Hydraulics = z.infer<typeof hydraulicsSchema>;

export const hydraulicsQuerySchema = z.object({
  mode: z.enum(['virtual', 'actual']).default('virtual'),
});
