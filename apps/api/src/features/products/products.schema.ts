import { numeric, pgEnum, pgTable, varchar } from "drizzle-orm/pg-core";
import { timestamps, uuidv7 } from "@/db/_shared/columns";
import { numericConfig } from "@/lib/helpers/measurement";

enum ProductUnit {
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

enum ProductOrigin {
  Foreign = "foreign",
  Local = "local",
}

export const productUnitEnum = pgEnum("product_unit", ProductUnit);
export const productOriginEnum = pgEnum("product_origin", ProductOrigin);

export const products = pgTable("products", {
  id: uuidv7,
  name: varchar("name", { length: 255 }).notNull().unique(),
  size: numeric("size", numericConfig).notNull(), // required
  unit: productUnitEnum("unit").notNull(), // required

  // Note: both `width` and `height` have to have value or neither
  width: numeric("width", numericConfig),
  height: numeric("height", numericConfig),

  specificGravity: numeric("specific_gravity", numericConfig),
  origin: productOriginEnum("origin"),

  price: numeric("price", numericConfig),
  ...timestamps,
});

// id: string;

//     origin: "local" | "foreign";
//     price?: number;
//     createdAt: Date;
//     updatedAt: Date;
