import { z } from 'zod';
import { idSchema } from './base';

// Pit names and capacities of a project (workbook MudPits). Capacity in m³ (SI).

export const pitCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    /** m³. */
    capacity: z.number().positive(),
    /** Position in the pit list; appended at the end when omitted. */
    sortOrder: z.number().int().min(1).optional(),
  })
  .strict();
export type PitCreate = z.infer<typeof pitCreateSchema>;

export const pitUpdateSchema = pitCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type PitUpdate = z.infer<typeof pitUpdateSchema>;

export const pitSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  name: z.string(),
  capacity: z.number(),
  sortOrder: z.number().int(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Pit = z.infer<typeof pitSchema>;

/** Pits are a small fixed collection: returned whole, without pagination (docs/04). */
export const pitListQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const pitParamsSchema = z.object({ pitId: idSchema });
