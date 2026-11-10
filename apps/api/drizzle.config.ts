import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  // Every feature owns its tables; src/db/schema.ts re-exports them all.
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
