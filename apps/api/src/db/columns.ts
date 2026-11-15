import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

// Column helpers used by every table (docs/03-database-schema-and-migrations.md).
// Spread them into a table: pgTable('wells', { ...id, name: text().notNull(), ...timestamps, ...authorship })

/** `id uuid primary key default gen_random_uuid()` */
export const id = {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
};

/** `created_at`, `updated_at` as `timestamptz not null default now()`; updated_at is refreshed on update. */
export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Nullable until v0.9.0, when the foreign keys to the user table are added. */
export const authorship = {
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
};
