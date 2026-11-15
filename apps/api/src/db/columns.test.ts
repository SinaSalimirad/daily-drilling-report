import { describe, expect, it } from 'bun:test';
import { getTableConfig, isPgEnum, PgTable, pgTable, text } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from './columns';
import * as schema from './schema';

const sample = pgTable('samples', { ...id, name: text().notNull(), ...timestamps, ...authorship });

const column = (table: PgTable, name: string) =>
  getTableConfig(table).columns.find((c) => c.name === name);

describe('column helpers', () => {
  it('id is a uuid primary key with a database default', () => {
    const c = column(sample, 'id');
    expect(c?.getSQLType()).toBe('uuid');
    expect(c?.primary).toBe(true);
    expect(c?.hasDefault).toBe(true);
  });

  it('timestamps are timestamptz not null with a default, in snake_case', () => {
    for (const name of ['created_at', 'updated_at']) {
      const c = column(sample, name);
      expect(c?.getSQLType()).toBe('timestamp with time zone');
      expect(c?.notNull).toBe(true);
      expect(c?.hasDefault).toBe(true);
    }
    expect(column(sample, 'updated_at')?.onUpdateFn).toBeFunction();
  });

  it('authorship columns are nullable uuids', () => {
    for (const name of ['created_by', 'updated_by']) {
      const c = column(sample, name);
      expect(c?.getSQLType()).toBe('uuid');
      expect(c?.notNull).toBe(false);
    }
  });
});

describe('schema', () => {
  // docs/03: every table uses the helpers. Fails as soon as a table without them is added.
  const tables = (Object.values(schema) as unknown[]).filter(
    (value): value is PgTable => value instanceof PgTable && !isPgEnum(value),
  );
  for (const table of tables) {
    it(`${getTableConfig(table).name} uses id, timestamps and authorship`, () => {
      const names = getTableConfig(table).columns.map((c) => c.name);
      // docs/03: `report_results` has `report_id` as its primary key instead of `id`.
      const keyed = getTableConfig(table).name === 'report_results' ? [] : ['id'];
      for (const required of [...keyed, 'created_at', 'updated_at', 'created_by', 'updated_by']) {
        expect(names).toContain(required);
      }
    });
  }
  it('is importable', () => {
    expect(tables).toBeArray();
  });
});
