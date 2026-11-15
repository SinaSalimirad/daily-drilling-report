import { z } from 'zod';
import { idSchema, paginationQuerySchema, reportDateSchema, sortSchema } from './base';
import { rigTypeSchema, wellDesignationSchema, wellTypeSchema } from './enums';

// Well under a project (workbook GData; docs/03). Water depth in metres (SI).

const text = (max: number) => z.string().trim().min(1).max(max);

export const wellCreateSchema = z
  .object({
    name: text(120),
    designation: wellDesignationSchema.nullable().optional(),
    wellType: wellTypeSchema,
    rigType: rigTypeSchema,
    /** Gregorian `YYYY-MM-DD`; base of the automatic report date. */
    spudDate: reportDateSchema.nullable().optional(),
    /** Metres; offshore wells only. */
    waterDepth: z.number().nonnegative().nullable().optional(),
  })
  .strict();
export type WellCreate = z.infer<typeof wellCreateSchema>;

export const wellUpdateSchema = wellCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type WellUpdate = z.infer<typeof wellUpdateSchema>;

export const wellSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string(),
  designation: wellDesignationSchema.nullable(),
  wellType: wellTypeSchema,
  rigType: rigTypeSchema,
  spudDate: reportDateSchema.nullable(),
  waterDepth: z.number().nullable(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Well = z.infer<typeof wellSchema>;

export const WELL_SORT_FIELDS = ['name', 'spudDate', 'createdAt'] as const;

export const wellListQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(WELL_SORT_FIELDS).optional(),
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type WellListQuery = z.infer<typeof wellListQuerySchema>;

export const wellParamsSchema = z.object({ wellId: idSchema });
