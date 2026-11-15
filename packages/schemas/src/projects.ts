import { z } from 'zod';
import { idSchema, paginationQuerySchema, sortSchema } from './base';
import { unitSystemSchema } from './unit-system';

// Project: operator, contractor, rig, field, currency and the display unit system
// (workbook GData; docs/03). Used by the API routes and the web forms.

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => text(max).nullable().optional();

export const projectCreateSchema = z
  .object({
    name: text(120),
    operator: text(120),
    contractor: optionalText(120),
    rigName: optionalText(120),
    fieldCountry: optionalText(120),
    /** Printed in every cost label, e.g. `$`, `€`, `IRR`. */
    currency: text(8),
    /** Defaults to the SI preset when omitted. */
    unitSystem: unitSystemSchema.optional(),
  })
  .strict();
export type ProjectCreate = z.infer<typeof projectCreateSchema>;

export const projectUpdateSchema = projectCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type ProjectUpdate = z.infer<typeof projectUpdateSchema>;

export const projectSchema = z.object({
  id: idSchema,
  name: z.string(),
  operator: z.string(),
  contractor: z.string().nullable(),
  rigName: z.string().nullable(),
  fieldCountry: z.string().nullable(),
  currency: z.string(),
  unitSystem: unitSystemSchema,
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Project = z.infer<typeof projectSchema>;

export const PROJECT_SORT_FIELDS = ['name', 'createdAt'] as const;

/** `GET /projects`: active projects by default; `archived=true` lists the archived ones. */
export const projectListQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(PROJECT_SORT_FIELDS).optional(),
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export const projectParamsSchema = z.object({ projectId: idSchema });
