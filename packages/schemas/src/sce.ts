import { z } from 'zod';
import { idSchema } from './base';

// Solids-control equipment of a project (workbook SCE, 10 rows): shakers, desanders,
// desilters, mud cleaners, centrifuges. The workbook's allowed types are not in the
// analysis, so `type` is free text. The report prints "manufacturer type #unitNumber".

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const sceUnitCreateSchema = z
  .object({
    type: z.string().trim().min(1).max(60),
    unitNumber: z.number().int().min(1).nullable().optional(),
    manufacturer: optionalText(120),
    /** Screen size as written on the screen, e.g. `API 140`. */
    screenSize: optionalText(60),
    model: optionalText(120),
    /** Position in the list; appended at the end when omitted. */
    sortOrder: z.number().int().min(1).optional(),
  })
  .strict();
export type SceUnitCreate = z.infer<typeof sceUnitCreateSchema>;

export const sceUnitUpdateSchema = sceUnitCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type SceUnitUpdate = z.infer<typeof sceUnitUpdateSchema>;

export const sceUnitSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  type: z.string(),
  unitNumber: z.number().int().nullable(),
  manufacturer: z.string().nullable(),
  screenSize: z.string().nullable(),
  model: z.string().nullable(),
  sortOrder: z.number().int(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type SceUnit = z.infer<typeof sceUnitSchema>;

export const sceUnitListQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const sceUnitParamsSchema = z.object({ sceUnitId: idSchema });
