import { z } from "zod";
import { insertProjectSchema, updateProjectSchema } from "./projects.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createProjectBody = insertProjectSchema;

// Update (PATCH) changes only the fields that are sent.
export const updateProjectBody = updateProjectSchema;

export const projectIdParams = z.object({ id: z.uuid() });
