import { sql } from "drizzle-orm";
import { check, numeric, pgEnum, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig } from "@/lib/helpers/measurement";

export enum ProductUnit {
  BigBag = "BB",
  Barrel = "bbl",
  Drum = "DR",
  Gallon = "gal",
  Kilogram = "kg",
  Liter = "l",
  Pound = "lb",
  CubicMeter = "m³",
  SquareMeter = "m x m",
  Tonne = "ton",
}

export enum ProductOrigin {
  Foreign = "foreign",
  Local = "local",
}

export const productUnitEnum = pgEnum("product_unit", ProductUnit);
export const productOriginEnum = pgEnum("product_origin", ProductOrigin);

export const products = pgTable(
  "products",
  {
    id: uuidv7,
    name: varchar("name", { length: 255 }).notNull().unique(),
    size: numeric("size", numericConfig).notNull(), // required
    unit: productUnitEnum("unit").notNull(), // required

    // Note: `width` and `height` are a pair: set both or leave both empty
    // (enforced by the DB check constraint and the insert schema refine below)
    width: numeric("width", numericConfig),
    height: numeric("height", numericConfig),

    specificGravity: numeric("specific_gravity", numericConfig),
    origin: productOriginEnum("origin"),

    price: numeric("price", numericConfig),
    ...timestamps,
  },
  (table) => [
    // Reject rows where only one of `width` / `height` is NULL.
    // (NULL = NULL) and (NOT NULL = NOT NULL) pass; mixed fails.
    check("products_width_height_pair", sql`(${table.width} IS NULL) = (${table.height} IS NULL)`),
    // `size`, `width`, `height`, `price` must be > 0 (NULL passes for optional columns)
    check("products_size_positive", sql`${table.size} > 0`),
    check("products_width_positive", sql`${table.width} > 0`),
    check("products_height_positive", sql`${table.height} > 0`),
    check("products_price_positive", sql`${table.price} > 0`),

    unique("products_name_size_unit_unique").on(table.name, table.size, table.unit),
  ],
);

const mustBePositive = { message: "must be greater than 0" };

// Fields the client is allowed to send. id and timestamps are set by the database.
const productInputFields = createInsertSchema(products, {
  unit: z.enum(ProductUnit),
  origin: z.enum(ProductOrigin).nullish(),
  size: (s) => s.refine((value) => value > 0, mustBePositive),
  width: (s) => s.refine((value) => value == null || value > 0, mustBePositive),
  height: (s) => s.refine((value) => value == null || value > 0, mustBePositive),
  price: (s) => s.refine((value) => value == null || value > 0, mustBePositive),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertProductSchema = productInputFields.refine(
  (data) => (data.width == null) === (data.height == null),
  {
    message: "width and height must both be provided or both be empty",
    path: ["width"],
  },
);

export const selectProductSchema = createSelectSchema(products);

export type InsertProduct = z.infer<typeof insertProductSchema>;
