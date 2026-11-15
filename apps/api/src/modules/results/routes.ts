import { reportParamsSchema, reportResultSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from '../reports/compose';

export const resultsRoutes = (db: Db) => {
  const { results } = composeReportServices(db);
  return new Elysia({ name: 'results' })
    .use(guard)
    .get(
      '/reports/:reportId/results',
      async ({ params }) => ok(await results.get(params.reportId)),
      {
        permission: 'report:read',
        params: reportParamsSchema,
        response: { 200: z.object({ data: reportResultSchema }) },
      },
    );
};
