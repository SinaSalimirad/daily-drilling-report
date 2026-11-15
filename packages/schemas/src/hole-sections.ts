import { z } from 'zod';
import { idSchema } from './base';
import { sectionTypeSchema } from './enums';

// Wellbore geometry of a well (workbook `WBG`, up to 10 rows; analysis §6.6). Lengths and
// diameters in metres (SI at rest). Linear weight and grade are not stored: no calculation
// reads them (KI-005).

export const MAX_HOLE_SECTIONS = 10;

export const holeSectionCreateSchema = z
  .object({
    type: sectionTypeSchema,
    /** Metres. Casing and liner start here; an open hole starts where the section above ends. */
    top: z.number().nonnegative(),
    /** Metres. 0 means "down to the depth of the report" (the last open hole). */
    bottom: z.number().nonnegative(),
    /** Metres; outside diameter of casing / liner. */
    outerDiameter: z.number().positive().nullable().optional(),
    /** Metres; inside diameter of casing / liner, or the bit diameter of an open hole. */
    innerDiameter: z.number().positive(),
    /** Position in the list; appended at the end when omitted. */
    sortOrder: z.number().int().min(1).optional(),
  })
  .strict();
export type HoleSectionCreate = z.infer<typeof holeSectionCreateSchema>;

export const holeSectionUpdateSchema = holeSectionCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type HoleSectionUpdate = z.infer<typeof holeSectionUpdateSchema>;

export const holeSectionSchema = z.object({
  id: idSchema,
  wellId: idSchema,
  type: sectionTypeSchema,
  top: z.number(),
  bottom: z.number(),
  outerDiameter: z.number().nullable(),
  innerDiameter: z.number(),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type HoleSectionRecord = z.infer<typeof holeSectionSchema>;

export const holeSectionParamsSchema = z.object({ holeSectionId: idSchema });

/** Total hole volume and average diameter down to a depth (workbook `BR15`, `WBG!M18`). */
export const geometryQuerySchema = z.object({
  /** Metres; the deepest bottom of the well when omitted. */
  td: z.coerce.number().nonnegative().optional(),
});

export const geometrySchema = z.object({
  /** Depth the figures are calculated to, metres. */
  td: z.number(),
  /** Total hole volume at TD, m³. */
  totalVolume: z.number(),
  /** Volume-weighted average hole diameter, metres. */
  averageDiameter: z.number(),
});
export type Geometry = z.infer<typeof geometrySchema>;
