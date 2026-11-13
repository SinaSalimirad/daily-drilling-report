import { z } from "zod";
import { insertWellSchema, updateWellSchema } from "./wells.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createWellBody = insertWellSchema;

// Update (PATCH) changes only the fields that are sent. projectId can't be changed.
export const updateWellBody = updateWellSchema;

export const wellIdParams = z.object({ id: z.uuid() });

// Optional filter: only the wells of one project.
export const listWellsQuery = z.object({ projectId: z.uuid().optional() });
