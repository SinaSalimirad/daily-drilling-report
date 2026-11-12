import { z } from "zod";
import { insertProductSchema, updateProductSchema } from "./products.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createProductBody = insertProductSchema;

// Update (PATCH) changes only the fields that are sent.
export const updateProductBody = updateProductSchema;

export const productIdParams = z.object({ id: z.uuid() });
