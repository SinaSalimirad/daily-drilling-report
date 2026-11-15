import { recapQuerySchema, recapSchema, wellParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { composeReportServices } from '../reports/compose';

export const recapRoutes = (db: Db) => {
  const { recap } = composeReportServices(db);
  return new Elysia({ name: 'recap' })
    .use(guard)
    .get(
      '/wells/:wellId/recap',
      async ({ params, query }) => ok(await recap.get(params.wellId, query.scope, query.sectionId)),
      {
        permission: 'recap:read',
        params: wellParamsSchema,
        query: recapQuerySchema,
        response: { 200: z.object({ data: recapSchema }) },
      },
    );
};
