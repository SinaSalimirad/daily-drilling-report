import { sql } from 'drizzle-orm';
import type { Db } from '../../db/client';

export const healthRepository = (db: Db) => ({
  /** Throws when the database cannot be reached. */
  async ping(): Promise<void> {
    await db.execute(sql`select 1`);
  },
});
