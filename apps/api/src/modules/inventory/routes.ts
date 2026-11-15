import { inventoryPutSchema, inventorySchema, reportParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from '../reports/compose';

const one = z.object({
  data: inventorySchema,
  warnings: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        details: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional(),
});

export const inventoryRoutes = (db: Db) => {
  const { inventory: service, reports } = composeReportServices(db);
  return new Elysia({ name: 'inventory' })
    .use(guard)
    .get(
      '/reports/:reportId/inventory',
      async ({ params }) =>
        ok(await service.get(params.reportId), await reports.warnings(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: one } },
    )
    .put(
      '/reports/:reportId/inventory',
      async ({ params, body }) => {
        const data = await service.replace(params.reportId, body);
        return ok(data, await reports.warnings(params.reportId));
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: inventoryPutSchema,
        response: { 200: one },
      },
    );
};
