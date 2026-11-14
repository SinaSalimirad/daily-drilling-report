import { z } from "zod";
import { createUserSchema, updateUserSchema } from "./users.schema";

export const createUserBody = createUserSchema;

export const updateUserBody = updateUserSchema;

export const userIdParams = z.object({ id: z.uuid() });
