import {
  pumpReadingsPutSchema,
  pumpReadingsSchema,
  reportParamsSchema,
  volumeEntriesPutSchema,
  volumesResultSchema,
} from '@ddr/schemas';
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
const volumes = z.object({ data: volumesResultSchema, warnings: z.array(warning).optional() });
const pumpsResponse = z.object({ data: pumpReadingsSchema });

export const volumesRoutes = (db: Db) => {
  const { volumes: service, reports } = composeReportServices(db);
  return new Elysia({ name: 'volumes' })
    .use(guard)
    .get(
      '/reports/:reportId/volumes',
      async ({ params }) =>
        ok(await service.get(params.reportId), await reports.warnings(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: volumes } },
    )
    .put(
      '/reports/:reportId/volumes',
      async ({ params, body }) => {
        const data = await service.replaceEntries(params.reportId, body);
        return ok(data, await reports.warnings(params.reportId));
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: volumeEntriesPutSchema,
        response: { 200: volumes },
      },
    )
    .get(
      '/reports/:reportId/pump-readings',
      async ({ params }) => ok(await service.getPumpReadings(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: pumpsResponse } },
    )
    .put(
      '/reports/:reportId/pump-readings',
      async ({ params, body }) => ok(await service.replacePumpReadings(params.reportId, body)),
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: pumpReadingsPutSchema,
        response: { 200: pumpsResponse },
      },
    );
};
