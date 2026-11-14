import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/config/env";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export const db = drizzle(pool);

export type DB = typeof db;

// The `tx` a `db.transaction(async (tx) => ...)` callback receives. Functions that must run
// inside a caller's transaction take `executor: DB | Transaction = db`.
export type Transaction = Parameters<Parameters<DB["transaction"]>[0]>[0];
