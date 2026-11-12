import { z } from "zod";
import { insertProductSchema } from "./products.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createProductBody = insertProductSchema;

// PUT replaces the whole product, so it takes the same body as create.
export const updateProductBody = insertProductSchema;

export const productIdParams = z.object({ id: z.uuid() });
