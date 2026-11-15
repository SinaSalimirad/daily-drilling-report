import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// One pg pool and one Drizzle instance per process (docs/03-database-schema-and-migrations.md).

export type DbOptions = {
  /**
   * Called when an idle pooled connection fails (e.g. PostgreSQL restarts). Without a
   * listener, pg's `error` event would crash the process; the pool reconnects by itself.
   */
  onIdleError?: (error: Error) => void;
};

export function createDb(databaseUrl: string, { onIdleError }: DbOptions = {}) {
  const pool = new Pool({ connectionString: databaseUrl, max: 10, connectionTimeoutMillis: 3000 });
  pool.on('error', (error) => onIdleError?.(error));
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>['db'];
