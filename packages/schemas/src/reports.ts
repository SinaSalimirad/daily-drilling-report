import { z } from 'zod';
import { idSchema, paginationQuerySchema, reportDateSchema } from './base';
import { reportStatusSchema } from './enums';

// Daily report of a well (workbook New Report macro; docs/03). The header, depths and
// remarks arrive with the revision-checked update of v0.3.0 (#31).

export const reportCreateSchema = z
  .object({
    sectionId: idSchema,
    /** Previous number + 1 when omitted (1 for the first report). */
    reportNo: z.number().int().min(1).optional(),
    /** Previous date + 1 day when omitted; the spud date for the first report. */
    reportDate: reportDateSchema.optional(),
  })
  .strict();
export type ReportCreate = z.infer<typeof reportCreateSchema>;

export const reportSchema = z.object({
  id: idSchema,
  wellId: idSchema,
  sectionId: idSchema,
  reportNo: z.number().int(),
  reportDate: reportDateSchema,
  status: reportStatusSchema,
  revision: z.number().int(),
  submittedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Report = z.infer<typeof reportSchema>;

/** Newest first (docs: list "paged, newest first"). */
export const reportListQuerySchema = paginationQuerySchema;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportParamsSchema = z.object({ reportId: idSchema });
