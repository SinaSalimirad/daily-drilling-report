import { z } from 'zod';
import { idSchema, reportDateSchema } from './base';
import { productOriginSchema, productUnitSchema } from './enums';
import { unitSystemSchema } from './unit-system';

// Consumption dashboard (home page, v1.1.0, decided 2026-11-16): the packages used, received and
// returned of every well the user may see; no cost (#220). Daily rows: the web app groups them
// by month in the user's calendar and by drilling section. holeSize in m (SI).

export const dashboardConsumptionSchema = z.object({
  projects: z.array(
    z.object({
      id: idSchema,
      name: z.string(),
      currency: z.string(),
      /** Display units of the project (hole size of a section). */
      unitSystem: unitSystemSchema,
    }),
  ),
  wells: z.array(z.object({ id: idSchema, projectId: idSchema, name: z.string() })),
  sections: z.array(
    z.object({
      id: idSchema,
      wellId: idSchema,
      holeSize: z.number(),
      sortOrder: z.number().int(),
    }),
  ),
  products: z.array(
    z.object({
      projectProductId: idSchema,
      projectId: idSchema,
      name: z.string(),
      packageSize: z.number(),
      packageUnit: productUnitSchema,
      origin: productOriginSchema,
    }),
  ),
  /** One row per well, report date and product with a move (used or received not zero). */
  usage: z.array(
    z.object({
      wellId: idSchema,
      sectionId: idSchema,
      reportDate: reportDateSchema,
      projectProductId: idSchema,
      /** Packages used. */
      used: z.number(),
      /** Packages received (a positive "received" move). */
      received: z.number(),
      /** Packages returned to the warehouse (a negative "received" move, as a positive number). */
      returned: z.number(),
    }),
  ),
});
export type DashboardConsumption = z.infer<typeof dashboardConsumptionSchema>;
