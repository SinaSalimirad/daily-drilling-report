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

const text = (max: number) => z.string().trim().min(1).max(max);
const people = z.array(text(120)).max(2);
const depth = z.number().nonnegative().nullable();

/**
 * Header fields of the report (workbook DMR header, depths and remarks). The request
 * carries the `revision` it read; a mismatch is `409 REVISION_MISMATCH` (docs/04).
 */
export const reportUpdateSchema = z
  .object({
    revision: z.number().int().min(1),
    sectionId: idSchema.optional(),
    /** The drill string in the hole (a run of the same well); null for none. */
    bhaRunId: idSchema.nullable().optional(),
    /** Metres. */
    bitDepth: depth.optional(),
    /** Metres. */
    td: depth.optional(),
    /** Metres. */
    tvd: depth.optional(),
    /** Pa; standpipe pressure. */
    spp: depth.optional(),
    /** m³; fluid in the hole that is not mud (workbook `AA13`). */
    fluidNotMud: depth.optional(),
    /** Operator and contractor representative (workbook H7, H8). */
    representatives: people.optional(),
    /** Fluids engineers printed on the report (workbook A83:A84). */
    engineers: people.optional(),
    drillingRemarks: z.string().trim().max(4000).nullable().optional(),
    fluidRemarks: z.string().trim().max(4000).nullable().optional(),
    formation: z.string().trim().max(200).nullable().optional(),
  })
  .strict()
  .refine(
    (value) => Object.keys(value).some((key) => key !== 'revision'),
    'Send at least one field to change',
  );
export type ReportUpdate = z.infer<typeof reportUpdateSchema>;

/** Submit: the revision the client read, and whether it accepts the open warnings. */
export const reportSubmitSchema = z
  .object({
    revision: z.number().int().min(1),
    acknowledgeWarnings: z.boolean().default(false),
  })
  .strict();
export type ReportSubmit = z.infer<typeof reportSubmitSchema>;

export const reportSchema = z.object({
  id: idSchema,
  wellId: idSchema,
  sectionId: idSchema,
  bhaRunId: idSchema.nullable(),
  reportNo: z.number().int(),
  reportDate: reportDateSchema,
  status: reportStatusSchema,
  revision: z.number().int(),
  bitDepth: z.number().nullable(),
  td: z.number().nullable(),
  tvd: z.number().nullable(),
  spp: z.number().nullable(),
  fluidNotMud: z.number().nullable(),
  /** TD today minus TD of the previous report (workbook V17); null while either is unknown. */
  dailyDrilled: z.number().nullable(),
  representatives: z.array(z.string()),
  engineers: z.array(z.string()),
  drillingRemarks: z.string().nullable(),
  fluidRemarks: z.string().nullable(),
  formation: z.string().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  /** A submitted report changed after it was submitted (a header edit raised the revision). */
  editedAfterSubmit: z.boolean(),
  /** Warning codes the engineer accepted when submitting. */
  acknowledgedWarnings: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Report = z.infer<typeof reportSchema>;

/** Newest first (docs: list "paged, newest first"). */
export const reportListQuerySchema = paginationQuerySchema;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;

export const reportParamsSchema = z.object({ reportId: idSchema });

// Activities of the day (workbook DMR activity rows): hours per activity, in order.

export const activityRowSchema = z
  .object({
    activityId: idSchema,
    /** Hours (docs/03: durations stay in hours). */
    hours: z.number().positive().max(24),
  })
  .strict();

/** `PUT` replaces the whole list; the order of the array is the order of the rows. */
export const reportActivitiesPutSchema = z
  .object({ activities: z.array(activityRowSchema).max(40) })
  .strict();
export type ReportActivitiesPut = z.infer<typeof reportActivitiesPutSchema>;

export const reportActivitiesSchema = z.object({
  activities: z.array(
    z.object({
      id: idSchema,
      activityId: idSchema,
      name: z.string(),
      hours: z.number(),
      sortOrder: z.number().int(),
    }),
  ),
  /** Sum of the hours. */
  totalHours: z.number(),
  /** Name of the last row (workbook "present activity"); null for an empty list. */
  presentActivity: z.string().nullable(),
});
export type ReportActivities = z.infer<typeof reportActivitiesSchema>;
