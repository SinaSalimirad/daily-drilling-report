import {
  pitCreateSchema,
  pitListQuerySchema,
  pitParamsSchema,
  pitSchema,
  pitUpdateSchema,
  projectParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { pitsRepository } from './repository';
import { pitsService } from './service';

// Pits of a project. A small fixed collection, so the list has no pagination (docs/04).

const one = z.object({ data: pitSchema });
const all = z.object({ data: z.array(pitSchema) });

export const pitsRoutes = (db: Db) => {
  const service = pitsService(pitsRepository(db), projectsService(projectsRepository(db)));
  return new Elysia({ name: 'pits' })
    .use(guard)
    .get(
      '/projects/:projectId/pits',
      async ({ params, query }) =>
        ok(await service.listByProject(params.projectId, query.archived)),
      {
        permission: 'report:read',
        params: projectParamsSchema,
        query: pitListQuerySchema,
        response: { 200: all },
      },
    )
    .post(
      '/projects/:projectId/pits',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.projectId, body));
      },
      {
        permission: 'master:manage',
        params: projectParamsSchema,
        body: pitCreateSchema,
        response: { 201: one },
      },
    )
    .get('/pits/:pitId', async ({ params }) => ok(await service.get(params.pitId)), {
      permission: 'report:read',
      params: pitParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/pits/:pitId',
      async ({ params, body }) => ok(await service.update(params.pitId, body)),
      {
        permission: 'master:manage',
        params: pitParamsSchema,
        body: pitUpdateSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/pits/:pitId',
      async ({ params, set }) => {
        const result = await service.remove(params.pitId);
        if (result.deleted) {
          set.status = 204;
          return;
        }
        return ok(result.pit);
      },
      {
        permission: 'master:manage',
        params: pitParamsSchema,
        response: { 200: one, 204: z.undefined() },
      },
    );
};
