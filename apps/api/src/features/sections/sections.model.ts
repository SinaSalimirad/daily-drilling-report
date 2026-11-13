import { z } from "zod";
import { insertSectionSchema, updateSectionSchema } from "./sections.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createSectionBody = insertSectionSchema;

// Update (PATCH) changes only the fields that are sent. wellId can't be changed.
export const updateSectionBody = updateSectionSchema;

export const sectionIdParams = z.object({ id: z.uuid() });

// Optional filter: only the sections of one well.
export const listSectionsQuery = z.object({ wellId: z.uuid().optional() });
