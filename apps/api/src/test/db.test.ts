import { describe, expect, it } from 'bun:test';
import { sql } from 'drizzle-orm';
import { createTestDb } from './db';

describe('createTestDb', () => {
  it('migrates an isolated schema and drops it afterwards', async () => {
    const { db, drop } = await createTestDb();
    const [row] = (
      await db.execute<{ schema: string; tables: number }>(
        sql`select current_schema() as schema, count(*)::int as tables
            from information_schema.tables where table_schema = current_schema()`,
      )
    ).rows;
    expect(row?.schema).toStartWith('test_');
    expect(row?.tables).toBeGreaterThan(0);
    await drop();
  });
});
