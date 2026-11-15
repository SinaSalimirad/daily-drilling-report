import { hydraulicsQuerySchema, hydraulicsSchema, reportParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from '../reports/compose';

export const hydraulicsRoutes = (db: Db) => {
  const { hydraulics: service } = composeReportServices(db);
  return new Elysia({ name: 'hydraulics' })
    .use(guard)
    .get(
      '/reports/:reportId/hydraulics',
      async ({ params, query }) => ok(await service.get(params.reportId, query.mode)),
      {
        permission: 'report:read',
        params: reportParamsSchema,
        query: hydraulicsQuerySchema,
        response: { 200: z.object({ data: hydraulicsSchema }) },
      },
    );
};
