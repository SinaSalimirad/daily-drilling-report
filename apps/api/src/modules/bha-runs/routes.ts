import {
  bhaRunInputSchema,
  bhaRunParamsSchema,
  bhaRunSchema,
  wellParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { bhaRunsRepository } from './repository';
import { bhaRunsService } from './service';

const one = z.object({ data: bhaRunSchema });
const all = z.object({ data: z.array(bhaRunSchema) });

export const bhaRunsRoutes = (db: Db) => {
  const service = bhaRunsService(
    bhaRunsRepository(db),
    wellsService(wellsRepository(db), projectsService(projectsRepository(db))),
  );
  return new Elysia({ name: 'bha-runs' })
    .use(guard)
    .get(
      '/wells/:wellId/bha-runs',
      async ({ params }) => ok(await service.listByWell(params.wellId)),
      {
        permission: 'report:read',
        params: wellParamsSchema,
        response: { 200: all },
      },
    )
    .post(
      '/wells/:wellId/bha-runs',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.wellId, body));
      },
      {
        permission: 'report:write',
        params: wellParamsSchema,
        body: bhaRunInputSchema,
        response: { 201: one },
      },
    )
    .get('/bha-runs/:bhaRunId', async ({ params }) => ok(await service.get(params.bhaRunId)), {
      permission: 'report:read',
      params: bhaRunParamsSchema,
      response: { 200: one },
    })
    .put(
      '/bha-runs/:bhaRunId',
      async ({ params, body }) => ok(await service.replace(params.bhaRunId, body)),
      {
        permission: 'report:write',
        params: bhaRunParamsSchema,
        body: bhaRunInputSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/bha-runs/:bhaRunId',
      async ({ params, set }) => {
        await service.remove(params.bhaRunId);
        set.status = 204;
      },
      {
        permission: 'report:write',
        params: bhaRunParamsSchema,
        response: { 204: z.undefined() },
      },
    );
};
