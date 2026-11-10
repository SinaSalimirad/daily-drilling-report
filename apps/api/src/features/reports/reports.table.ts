import { date, integer, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  wellName: text("well_name").notNull(),
  reportDate: date("report_date").notNull(),
  depthM: integer("depth_m").notNull(),
  mudWeightPpg: numeric("mud_weight_ppg", { precision: 5, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Report = typeof reports.$inferSelect;
