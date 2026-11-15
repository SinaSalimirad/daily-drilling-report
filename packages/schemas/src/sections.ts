import { z } from 'zod';
import { idSchema } from './base';
import { fluidTypeSchema } from './enums';

// Drilling section of a well (workbook "New Section" macro; docs/03). Hole size in
// metres, planned weight in kg/m³, planned yield point in Pa (SI at rest, docs/03).

export const sectionCreateSchema = z
  .object({
    /** Metres (workbook AK3 holds inches; conversion is in packages/calc/units). */
    holeSize: z.number().positive(),
    fluidType: fluidTypeSchema,
    /** Lookup `fluid_systems`; optional. */
    fluidSystemId: idSchema.nullable().optional(),
    /** kg/m³. */
    planMudWeight: z.number().positive().nullable().optional(),
    /** Pa. */
    planYieldPoint: z.number().nonnegative().nullable().optional(),
    /** mL per 30 min (API filtrate; a dial-type reading, not converted). */
    planFluidLoss: z.number().nonnegative().nullable().optional(),
    /** Position in the well; appended at the end when omitted. */
    sortOrder: z.number().int().min(1).optional(),
  })
  .strict();
export type SectionCreate = z.infer<typeof sectionCreateSchema>;

export const sectionUpdateSchema = sectionCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type SectionUpdate = z.infer<typeof sectionUpdateSchema>;

export const sectionSchema = z.object({
  id: idSchema,
  wellId: idSchema,
  holeSize: z.number(),
  fluidType: fluidTypeSchema,
  fluidSystemId: idSchema.nullable(),
  planMudWeight: z.number().nullable(),
  planYieldPoint: z.number().nullable(),
  planFluidLoss: z.number().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Section = z.infer<typeof sectionSchema>;

export const sectionParamsSchema = z.object({ sectionId: idSchema });
