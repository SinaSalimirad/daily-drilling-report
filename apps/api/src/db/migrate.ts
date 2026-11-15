import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config/env';
import { createDb } from './client';

// `bun run db:migrate`: applies every migration in ./migrations that is not applied yet.
// Repeatable: applied migrations are recorded in drizzle.__drizzle_migrations.

const { db, pool } = createDb(env.DATABASE_URL);
try {
  await migrate(db, { migrationsFolder: path.join(import.meta.dirname, 'migrations') });
  console.info('migrations applied');
} finally {
  await pool.end();
}
