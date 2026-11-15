import { env } from '../../config/env';
import { createDb, type Db } from '../client';

/** Runs one seed against DATABASE_URL inside a transaction and closes the pool. */
export async function runSeed(name: string, seed: (db: Db) => Promise<number>) {
  const { db, pool } = createDb(env.DATABASE_URL);
  try {
    const rows = await db.transaction(async (tx) => seed(tx as unknown as Db));
    console.info(`seed ${name}: ${rows} rows written`);
  } finally {
    await pool.end();
  }
}
