import {
  projectCreateSchema,
  projectListQuerySchema,
  projectParamsSchema,
  projectSchema,
  projectUpdateSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { list, ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from './repository';
import { projectsService } from './service';

// /api/v1/projects (docs/04-api-conventions.md). Archive instead of delete (docs/03).

const one = z.object({ data: projectSchema });
const many = z.object({
  data: z.array(projectSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export const projectsRoutes = (db: Db) => {
  const service = projectsService(projectsRepository(db));
  return new Elysia({ name: 'projects', prefix: '/projects' })
    .use(guard)
    .get(
      '/',
      async ({ query }) => {
        const { data, meta } = await service.list(query);
        return list(data, meta);
      },
      { permission: 'report:read', query: projectListQuerySchema, response: { 200: many } },
    )
    .post(
      '/',
      async ({ body, set }) => {
        set.status = 201;
        return ok(await service.create(body));
      },
      { permission: 'project:manage', body: projectCreateSchema, response: { 201: one } },
    )
    .get('/:projectId', async ({ params }) => ok(await service.get(params.projectId)), {
      permission: 'report:read',
      params: projectParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/:projectId',
      async ({ params, body }) => ok(await service.update(params.projectId, body)),
      {
        permission: 'project:manage',
        params: projectParamsSchema,
        body: projectUpdateSchema,
        response: { 200: one },
      },
    )
    .post(
      '/:projectId/archive',
      async ({ params }) => ok(await service.archive(params.projectId)),
      {
        permission: 'project:manage',
        params: projectParamsSchema,
        response: { 200: one },
      },
    );
};
