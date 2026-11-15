import path from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from '../config/env';
import { createDb, type Db } from '../db/client';

// docs/09: database tests run "against a schema recreated per test file". Each call
// creates an empty PostgreSQL schema, applies every migration into it and returns a
// Drizzle instance bound to it; `drop()` removes it again. Tests never write to the
// development data in `public`.

export type TestDb = { db: Db; drop: () => Promise<void> };

export async function createTestDb(): Promise<TestDb> {
  const name = `test_${crypto.randomUUID().replaceAll('-', '')}`;
  const admin = createDb(env.DATABASE_URL);
  await admin.db.execute(sql.raw(`create schema "${name}"`));

  const { db, pool } = createDb(env.DATABASE_URL, { searchPath: name });
  await migrate(db, {
    migrationsFolder: path.join(import.meta.dirname, '../db/migrations'),
    migrationsSchema: name,
  });

  return {
    db,
    async drop() {
      await pool.end();
      await admin.db.execute(sql.raw(`drop schema "${name}" cascade`));
      await admin.pool.end();
    },
  };
}
