import {
  reportActivitiesPutSchema,
  reportActivitiesSchema,
  reportParamsSchema,
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
const one = z.object({ data: reportActivitiesSchema, warnings: z.array(warning).optional() });

export const reportActivitiesRoutes = (db: Db) => {
  const { activities: service } = composeReportServices(db);
  return new Elysia({ name: 'report-activities' })
    .use(guard)
    .get(
      '/reports/:reportId/activities',
      async ({ params }) => {
        const { data, warnings } = await service.get(params.reportId);
        return ok(data, warnings);
      },
      {
        permission: 'report:read',
        params: reportParamsSchema,
        response: { 200: one },
      },
    )
    .put(
      '/reports/:reportId/activities',
      async ({ params, body }) => {
        const { data, warnings } = await service.replace(params.reportId, body);
        return ok(data, warnings);
      },
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: reportActivitiesPutSchema,
        response: { 200: one },
      },
    );
};
