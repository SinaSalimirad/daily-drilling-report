import { reportParamsSchema, samplesPutSchema, samplesResultSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from '../reports/compose';

const warning = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});
const one = z.object({ data: samplesResultSchema, warnings: z.array(warning).optional() });

export const samplesRoutes = (db: Db) => {
  const { samples: service, reports } = composeReportServices(db);
  return new Elysia({ name: 'samples' })
    .use(guard)
    .get(
      '/reports/:reportId/samples',
      async ({ params }) =>
        ok(await service.get(params.reportId), await reports.warnings(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: one } },
    )
    .put(
      '/reports/:reportId/samples',
      async ({ params, body }) => {
        const data = await service.replace(params.reportId, body);
        return ok(data, await reports.warnings(params.reportId));
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: samplesPutSchema,
        response: { 200: one },
      },
    );
};
