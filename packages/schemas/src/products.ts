import { z } from 'zod';
import { idSchema, paginationQuerySchema, sortSchema } from './base';
import { productOriginSchema, productUnitSchema } from './enums';

// Product catalogue (workbook PList) and the price list of a project (docs/03:
// `products`, `project_products`). The package ("25 kg", "55 gal") is catalogue data
// and keeps its own unit; stock quantities are counts of packages.

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    packageSize: z.number().positive(),
    packageUnit: productUnitSchema,
    specificGravity: z.number().positive().nullable().optional(),
  })
  .strict();
export type ProductCreate = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export const productSchema = z.object({
  id: idSchema,
  name: z.string(),
  packageSize: z.number(),
  packageUnit: productUnitSchema,
  specificGravity: z.number().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Product = z.infer<typeof productSchema>;

/** `GET /products`: sorted by name unless `sort` says otherwise. */
export const productListQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['name', 'createdAt']).optional(),
});
export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productParamsSchema = z.object({ productId: idSchema });

// --- price list ------------------------------------------------------------------

/** Money: up to 2 decimals (stored as numeric(14,2); docs/03). */
const money = z.number().nonnegative().max(999_999_999_999.99);

export const projectProductCreateSchema = z
  .object({
    productId: idSchema,
    origin: productOriginSchema,
    unitPrice: money,
    active: z.boolean().optional(),
  })
  .strict();
export type ProjectProductCreate = z.infer<typeof projectProductCreateSchema>;

export const projectProductUpdateSchema = z
  .object({ origin: productOriginSchema, unitPrice: money, active: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to change');
export type ProjectProductUpdate = z.infer<typeof projectProductUpdateSchema>;

export const projectProductSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  product: productSchema,
  origin: productOriginSchema,
  /** Price per package, in the project's currency. */
  unitPrice: z.number(),
  active: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ProjectProduct = z.infer<typeof projectProductSchema>;

export const projectProductParamsSchema = z.object({ projectProductId: idSchema });
