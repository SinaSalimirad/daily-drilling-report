import type { users } from "./users.schema";

// A user row without the password hash; the only shape that may leave the API.
export type PublicUser = Omit<typeof users.$inferSelect, "passwordHash">;
