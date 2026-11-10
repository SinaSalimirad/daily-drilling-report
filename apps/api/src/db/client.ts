import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { env } from "@/config/env";
import * as schema from "./schema";

const client = new SQL(env.databaseUrl);

export const db = drizzle({ client, schema });
export type Database = typeof db;
export { client as sql };
