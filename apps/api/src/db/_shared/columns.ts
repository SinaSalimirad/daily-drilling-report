import { timestamp, uuid } from "drizzle-orm/pg-core";
import { v7 } from "uuid";

const timestampConfig = {
  mode: "date",
  precision: 3,
  withTimezone: true,
} as const;

export const uuidv7 = uuid("id")
  .$defaultFn(() => v7())
  .primaryKey();

export const timestamps = {
  createdAt: timestamp("created_at", timestampConfig).defaultNow().notNull(),

  updatedAt: timestamp("updated_at", timestampConfig)
    .defaultNow()
    .notNull()
    .$onUpdateFn(() => new Date()),
};
