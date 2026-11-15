import { sql } from 'drizzle-orm';
import { timestamp, uuid } from 'drizzle-orm/pg-core';
import { currentUserId } from '../auth/context';
import { user } from './schema/auth';

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

/**
 * Who wrote the row: the user of the request, from `auth/context.ts`; null for seeds and
 * scripts. Foreign keys to the user table since v0.9.0 (docs/07, task 6).
 */
export const authorship = {
  createdBy: uuid('created_by')
    .references(() => user.id, { onDelete: 'set null' })
    .$defaultFn(() => currentUserId() as string),
  updatedBy: uuid('updated_by')
    .references(() => user.id, { onDelete: 'set null' })
    .$onUpdateFn(() => currentUserId() as string),
};
