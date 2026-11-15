import { z } from 'zod';
import { idSchema } from './base';
import { pumpTypeSchema } from './enums';

// Mud pumps of a project (workbook PEquip). Lengths in m (SI); efficiency in %.

export const pumpCreateSchema = z
  .object({
    model: z.string().trim().min(1).max(120),
    type: pumpTypeSchema,
    /** m. */
    linerDiameter: z.number().positive(),
    /** m. */
    strokeLength: z.number().positive(),
    /** Volumetric efficiency, % (0 < e ≤ 100). */
    efficiency: z.number().positive().max(100),
    /** Position in the pump list; appended at the end when omitted. */
    sortOrder: z.number().int().min(1).optional(),
  })
  .strict();
export type PumpCreate = z.infer<typeof pumpCreateSchema>;

export const pumpUpdateSchema = pumpCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type PumpUpdate = z.infer<typeof pumpUpdateSchema>;

export const pumpSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  model: z.string(),
  type: pumpTypeSchema,
  linerDiameter: z.number(),
  strokeLength: z.number(),
  efficiency: z.number(),
  sortOrder: z.number().int(),
  /** Calculated, m³ per stroke (@ddr/calc pumpOutputPerStrokeSI). */
  outputPerStroke: z.number(),
  archivedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Pump = z.infer<typeof pumpSchema>;

export const pumpListQuerySchema = z.object({
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export const pumpParamsSchema = z.object({ pumpId: idSchema });
