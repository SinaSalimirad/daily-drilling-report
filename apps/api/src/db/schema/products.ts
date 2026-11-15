import { PRODUCT_ORIGINS, PRODUCT_UNITS } from '@ddr/schemas';
import {
  boolean,
  doublePrecision,
  numeric,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authorship, id, timestamps } from '../columns';
import { projects } from './projects';

export const productUnitEnum = pgEnum('product_unit', PRODUCT_UNITS);
export const productOriginEnum = pgEnum('product_origin', PRODUCT_ORIGINS);

/** Product catalogue, shared by all projects. */
export const products = pgTable('products', {
  ...id,
  name: text().notNull().unique(),
  /** Package size in `package_unit` (catalogue data keeps its own unit; docs/03). */
  packageSize: doublePrecision().notNull(),
  packageUnit: productUnitEnum().notNull(),
  specificGravity: doublePrecision(),
  ...timestamps,
  ...authorship,
});

/** Price list of a project. A product on a price list cannot be deleted (FK restrict). */
export const projectProducts = pgTable(
  'project_products',
  {
    ...id,
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'restrict' }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    origin: productOriginEnum().notNull(),
    /** Price per package, project currency. numeric → string in Drizzle; converted in the repository. */
    unitPrice: numeric({ precision: 14, scale: 2 }).notNull(),
    active: boolean().notNull().default(true),
    /** Shown in the key-stock box of the report; at most five per project (checked in the service). */
    keyStock: boolean().notNull().default(false),
    ...timestamps,
    ...authorship,
  },
  (table) => [
    unique('project_products_project_id_product_id_unique').on(table.projectId, table.productId),
  ],
);
