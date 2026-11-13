import { z } from "zod";
import { insertReportSchema, updateReportSchema } from "./reports.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createReportBody = insertReportSchema;

// Update (PATCH) changes only the fields that are sent. wellId can't be changed.
export const updateReportBody = updateReportSchema;

export const reportIdParams = z.object({ id: z.uuid() });

// Optional filters: only the reports of one well and/or one section.
export const listReportsQuery = z.object({
  wellId: z.uuid().optional(),
  sectionId: z.uuid().optional(),
});
