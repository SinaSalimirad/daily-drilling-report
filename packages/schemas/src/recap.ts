import { z } from 'zod';
import { idSchema } from './base';
import { productOriginSchema, productUnitSchema } from './enums';
import { accountingColumnSchema } from './volumes';

// Recap of a section or of the whole well (workbook `Recap`; analysis §9). SI throughout:
// m³, kg/m³, hours, currency of the project.

export const recapQuerySchema = z.object({
  scope: z.enum(['section', 'well']).default('section'),
  /** The section to recap; the section of the latest report when omitted. */
  sectionId: idSchema.optional(),
});

export const recapSchema = z.object({
  scope: z.enum(['section', 'well']),
  sectionId: idSchema.nullable(),
  /** Reports the recap covers. */
  reports: z.object({
    count: z.number().int(),
    first: z.number().int().nullable(),
    last: z.number().int().nullable(),
  }),
  cost: z.object({ total: z.number(), local: z.number() }),
  products: z.array(
    z.object({
      projectProductId: idSchema,
      name: z.string(),
      packageSize: z.number(),
      packageUnit: productUnitSchema,
      origin: productOriginSchema,
      /** Packages used, and the average price they were booked at. */
      used: z.number(),
      unitPrice: z.number(),
      cost: z.number(),
      /** % of the total cost. */
      costShare: z.number(),
      /** Mass of product per volume of mud built, kg/m³; null for liquid packages. */
      concentration: z.number().nullable(),
      /** Volume of a liquid product per volume of mud built, % by volume; null for solids. */
      volumePercent: z.number().nullable(),
    }),
  ),
  accounting: accountingColumnSchema,
  /** Hours per activity over the reports covered. */
  operationHours: z.array(z.object({ activity: z.string(), hours: z.number() })),
  /** Mean of the rate of penetration of the reports that have one, m/s. */
  averageRop: z.number().nullable(),
});
export type Recap = z.infer<typeof recapSchema>;
