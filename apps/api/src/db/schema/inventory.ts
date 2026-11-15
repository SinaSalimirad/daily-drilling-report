import { numeric, pgTable, unique, uuid } from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projectProducts } from './products';
import { dailyReports } from './reports';

/**
 * Packages received and used of one product on one report (docs/03). Stock is never
 * stored: it is the sum of these rows. The price is copied onto the move, so a later
 * price change does not alter earlier reports.
 */
export const inventoryMoves = pgTable(
  'inventory_moves',
  {
    ...id,
    reportId: uuid()
      .notNull()
      .references(() => dailyReports.id, { onDelete: 'cascade' }),
    projectProductId: uuid()
      .notNull()
      .references(() => projectProducts.id, { onDelete: 'restrict' }),
    /** Packages; negative = returned. numeric(14,3) comes back as a string. */
    received: numeric({ precision: 14, scale: 3 }).notNull().default('0'),
    used: numeric({ precision: 14, scale: 3 }).notNull().default('0'),
    /** Price per package at the time the move was first written. */
    unitPrice: numeric({ precision: 14, scale: 2 }).notNull(),
    ...timestamps,
    ...authorship,
  },
  (table) => [
    unique('inventory_moves_report_id_project_product_id_unique').on(
      table.reportId,
      table.projectProductId,
    ),
  ],
);
