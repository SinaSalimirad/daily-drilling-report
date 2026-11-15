import {
  projectParamsSchema,
  pumpCreateSchema,
  pumpListQuerySchema,
  pumpParamsSchema,
  pumpSchema,
  pumpUpdateSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { pumpsRepository } from './repository';
import { pumpsService } from './service';

// Mud pumps of a project, each with its calculated output per stroke (m³).
// A small fixed collection, so the list has no pagination (docs/04).

const one = z.object({ data: pumpSchema });
const all = z.object({ data: z.array(pumpSchema) });

export const pumpsRoutes = (db: Db) => {
  const service = pumpsService(pumpsRepository(db), projectsService(projectsRepository(db)));
  return new Elysia({ name: 'pumps' })
    .use(guard)
    .get(
      '/projects/:projectId/pumps',
      async ({ params, query }) =>
        ok(await service.listByProject(params.projectId, query.archived)),
      {
        permission: 'report:read',
        params: projectParamsSchema,
        query: pumpListQuerySchema,
        response: { 200: all },
      },
    )
    .post(
      '/projects/:projectId/pumps',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.projectId, body));
      },
      {
        permission: 'master:manage',
        params: projectParamsSchema,
        body: pumpCreateSchema,
        response: { 201: one },
      },
    )
    .get('/pumps/:pumpId', async ({ params }) => ok(await service.get(params.pumpId)), {
      permission: 'report:read',
      params: pumpParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/pumps/:pumpId',
      async ({ params, body }) => ok(await service.update(params.pumpId, body)),
      {
        permission: 'master:manage',
        params: pumpParamsSchema,
        body: pumpUpdateSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/pumps/:pumpId',
      async ({ params, set }) => {
        const result = await service.remove(params.pumpId);
        if (result.deleted) {
          set.status = 204;
          return;
        }
        return ok(result.pump);
      },
      {
        permission: 'master:manage',
        params: pumpParamsSchema,
        response: { 200: one, 204: z.undefined() },
      },
    );
};
