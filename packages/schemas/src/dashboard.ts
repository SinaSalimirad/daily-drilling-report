import { z } from 'zod';
import { idSchema, reportDateSchema } from './base';
import { productOriginSchema, productUnitSchema } from './enums';

// Consumption dashboard (home page, v1.1.0, decided 2026-11-16): the chemical usage of every
// well the user may see. Daily rows: the web app groups them by month in the user's calendar
// and by drilling section. Money in the project's currency; holeSize in m (SI).

export const dashboardConsumptionSchema = z.object({
  projects: z.array(z.object({ id: idSchema, name: z.string(), currency: z.string() })),
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
  /** One row per well, report date and product with packages used > 0. */
  usage: z.array(
    z.object({
      wellId: idSchema,
      sectionId: idSchema,
      reportDate: reportDateSchema,
      projectProductId: idSchema,
      /** Packages used. */
      used: z.number(),
      /** used × the price copied onto the move. */
      cost: z.number(),
    }),
  ),
});
export type DashboardConsumption = z.infer<typeof dashboardConsumptionSchema>;
