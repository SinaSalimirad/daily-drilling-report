import {
  projectParamsSchema,
  wellCreateSchema,
  wellListQuerySchema,
  wellParamsSchema,
  wellSchema,
  wellUpdateSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { listScopeOf } from '../../auth/scope';
import type { Db } from '../../db/client';
import { list, ok } from '../../lib/response';
import { type GuardContext, guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { wellsRepository } from './repository';
import { wellsService } from './service';

// Wells are nested under their project for list / create, and addressed directly
// otherwise (docs/04: nest only for ownership, one level).

const one = z.object({ data: wellSchema });
const many = z.object({
  data: z.array(wellSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export const wellsRoutes = (db: Db) => {
  const service = wellsService(wellsRepository(db), projectsService(projectsRepository(db)));
  return new Elysia({ name: 'wells' })
    .use(guard)
    .get(
      '/projects/:projectId/wells',
      async (context) => {
        const { params, query } = context;
        const user = (context as unknown as GuardContext).authUser;
        const { data, meta } = await service.listByProject(
          params.projectId,
          query,
          listScopeOf(user),
        );
        return list(data, meta);
      },
      {
        permission: 'report:read',
        params: projectParamsSchema,
        query: wellListQuerySchema,
        response: { 200: many },
      },
    )
    .post(
      '/projects/:projectId/wells',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.projectId, body));
      },
      {
        permission: 'well:manage',
        params: projectParamsSchema,
        body: wellCreateSchema,
        response: { 201: one },
      },
    )
    .get('/wells/:wellId', async ({ params }) => ok(await service.get(params.wellId)), {
      permission: 'report:read',
      params: wellParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/wells/:wellId',
      async ({ params, body }) => ok(await service.update(params.wellId, body)),
      {
        permission: 'well:manage',
        params: wellParamsSchema,
        body: wellUpdateSchema,
        response: { 200: one },
      },
    )
    .post(
      '/wells/:wellId/archive',
      async ({ params }) => ok(await service.archive(params.wellId)),
      {
        permission: 'well:manage',
        params: wellParamsSchema,
        response: { 200: one },
      },
    );
};
