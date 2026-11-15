import { z } from 'zod';
import { idSchema } from './base';

// Drill string of a well (workbook `BHA`; analysis §6.7). A run belongs to the well; the
// report chooses the run that is in the hole. Lengths and diameters in metres, pressure in
// pascals (SI at rest).

export const MAX_BHA_COMPONENTS = 10;
export const MAX_NOZZLE_GROUPS = 3;

export const nozzleGroupSchema = z
  .object({
    /** Nozzle size in 32nds of an inch (dimensionless, as typed in the workbook). */
    size32: z.number().int().min(1).max(64),
    quantity: z.number().int().min(1).max(20),
  })
  .strict();

export const bhaComponentInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    /**
     * Metres. The first component is the drill pipe: its length is not typed, it is the
     * bit depth minus the others (send null).
     */
    length: z.number().positive().nullable(),
    outerDiameter: z.number().positive(),
    innerDiameter: z.number().nonnegative(),
  })
  .strict();

export const bhaRunInputSchema = z
  .object({
    /** Run number; the next one when omitted. */
    runNo: z.number().int().min(1).optional(),
    bitType: z.string().trim().max(80).nullable().optional(),
    /** Metres. */
    bitSize: z.number().positive(),
    manufacturer: z.string().trim().max(80).nullable().optional(),
    /** Total flow area in m² when it is known and typed (workbook `G27`). */
    knownTfa: z.number().positive().nullable().optional(),
    /** Pa; pressure loss of the motor and downhole tools (workbook `J24`). */
    toolPressureLoss: z.number().nonnegative().nullable().optional(),
    nozzles: z.array(nozzleGroupSchema).max(MAX_NOZZLE_GROUPS),
    components: z.array(bhaComponentInputSchema).max(MAX_BHA_COMPONENTS),
  })
  .strict();
export type BhaRunInput = z.infer<typeof bhaRunInputSchema>;

export const bhaRunSchema = z.object({
  id: idSchema,
  wellId: idSchema,
  runNo: z.number().int(),
  bitType: z.string().nullable(),
  bitSize: z.number(),
  manufacturer: z.string().nullable(),
  knownTfa: z.number().nullable(),
  toolPressureLoss: z.number().nullable(),
  /** Total flow area of the nozzles (or the known one), m². */
  tfa: z.number(),
  nozzles: z.array(nozzleGroupSchema),
  components: z.array(
    z.object({
      id: idSchema,
      sortOrder: z.number().int(),
      name: z.string(),
      length: z.number().nullable(),
      outerDiameter: z.number(),
      innerDiameter: z.number(),
    }),
  ),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type BhaRun = z.infer<typeof bhaRunSchema>;

export const bhaRunParamsSchema = z.object({ bhaRunId: idSchema });
