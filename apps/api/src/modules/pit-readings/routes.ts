import { pitReadingsPutSchema, pitReadingsSchema, reportParamsSchema } from '@ddr/schemas';
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
const one = z.object({ data: pitReadingsSchema, warnings: z.array(warning).optional() });

export const pitReadingsRoutes = (db: Db) => {
  const { pitReadings: service, reports } = composeReportServices(db);
  return new Elysia({ name: 'pit-readings' })
    .use(guard)
    .get(
      '/reports/:reportId/pit-readings',
      async ({ params }) =>
        ok(await service.get(params.reportId), await reports.warnings(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: one } },
    )
    .put(
      '/reports/:reportId/pit-readings',
      async ({ params, body }) => {
        const data = await service.replace(params.reportId, body);
        return ok(data, await reports.warnings(params.reportId));
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: pitReadingsPutSchema,
        response: { 200: one },
      },
    );
};
