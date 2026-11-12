import { z } from "zod";
import { insertInventorySchema, updateInventorySchema } from "./inventories.schema";

// Elysia accepts zod schemas directly, so validation lives in one place.
export const createInventoryBody = insertInventorySchema;

// Update (PATCH) changes only the fields that are sent.
export const updateInventoryBody = updateInventorySchema;

export const inventoryIdParams = z.object({ id: z.uuid() });
