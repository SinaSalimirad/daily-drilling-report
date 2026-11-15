import { z } from 'zod';
import { idSchema } from './base';
import { productOriginSchema, productUnitSchema } from './enums';

// Chemical inventory of one report (workbook `Chem Inv.`, analysis §7.2). Quantities are
// counts of packages. A negative `received` is a return to the warehouse.

const quantity = z.number().finite().min(-1_000_000).max(1_000_000);

export const inventoryMoveInputSchema = z
  .object({
    projectProductId: idSchema,
    /** Packages received today; negative = returned. */
    received: quantity,
    /** Packages used today. */
    used: quantity.min(0),
  })
  .strict();
export type InventoryMoveInput = z.infer<typeof inventoryMoveInputSchema>;

/** `PUT` replaces the moves of the report; products not listed (or with 0 / 0) have none. */
export const inventoryPutSchema = z
  .object({ moves: z.array(inventoryMoveInputSchema).max(200) })
  .strict();
export type InventoryPut = z.infer<typeof inventoryPutSchema>;

export const inventoryRowSchema = z.object({
  projectProductId: idSchema,
  productId: idSchema,
  name: z.string(),
  packageSize: z.number(),
  packageUnit: productUnitSchema,
  origin: productOriginSchema,
  /** Price per package: the price copied onto today's move, or the current price. */
  unitPrice: z.number(),
  /** Stock at the start of the day: received − used over the earlier reports of the well. */
  initial: z.number(),
  received: z.number(),
  used: z.number(),
  /** initial + received − used. */
  finalStock: z.number(),
  /** used × unitPrice. */
  dailyCost: z.number(),
});
export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export const inventorySchema = z.object({ rows: z.array(inventoryRowSchema) });
export type Inventory = z.infer<typeof inventorySchema>;
