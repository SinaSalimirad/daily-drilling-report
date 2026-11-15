import {
  projectParamsSchema,
  sceUnitCreateSchema,
  sceUnitListQuerySchema,
  sceUnitParamsSchema,
  sceUnitSchema,
  sceUnitUpdateSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { sceUnitsRepository } from './repository';
import { sceUnitsService } from './service';

// Solids-control equipment of a project: /projects/:projectId/sce-units and
// /sce-units/:sceUnitId. A small fixed collection, no pagination (docs/04).

const one = z.object({ data: sceUnitSchema });
const all = z.object({ data: z.array(sceUnitSchema) });

export const sceRoutes = (db: Db) => {
  const service = sceUnitsService(sceUnitsRepository(db), projectsService(projectsRepository(db)));
  return new Elysia({ name: 'sce' })
    .use(guard)
    .get(
      '/projects/:projectId/sce-units',
      async ({ params, query }) =>
        ok(await service.listByProject(params.projectId, query.archived)),
      {
        permission: 'report:read',
        params: projectParamsSchema,
        query: sceUnitListQuerySchema,
        response: { 200: all },
      },
    )
    .post(
      '/projects/:projectId/sce-units',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.projectId, body));
      },
      {
        permission: 'master:manage',
        params: projectParamsSchema,
        body: sceUnitCreateSchema,
        response: { 201: one },
      },
    )
    .get('/sce-units/:sceUnitId', async ({ params }) => ok(await service.get(params.sceUnitId)), {
      permission: 'report:read',
      params: sceUnitParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/sce-units/:sceUnitId',
      async ({ params, body }) => ok(await service.update(params.sceUnitId, body)),
      {
        permission: 'master:manage',
        params: sceUnitParamsSchema,
        body: sceUnitUpdateSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/sce-units/:sceUnitId',
      async ({ params, set }) => {
        const result = await service.remove(params.sceUnitId);
        if (result.deleted) {
          set.status = 204;
          return;
        }
        return ok(result.sceUnit);
      },
      {
        permission: 'master:manage',
        params: sceUnitParamsSchema,
        response: { 200: one, 204: z.undefined() },
      },
    );
};
