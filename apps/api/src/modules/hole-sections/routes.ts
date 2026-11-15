import {
  geometryQuerySchema,
  geometrySchema,
  holeSectionCreateSchema,
  holeSectionParamsSchema,
  holeSectionSchema,
  holeSectionUpdateSchema,
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
import { holeSectionsRepository } from './repository';
import { holeSectionsService } from './service';

const one = z.object({ data: holeSectionSchema });
const all = z.object({ data: z.array(holeSectionSchema) });

export const holeSectionsRoutes = (db: Db) => {
  const service = holeSectionsService(
    holeSectionsRepository(db),
    wellsService(wellsRepository(db), projectsService(projectsRepository(db))),
  );
  return new Elysia({ name: 'hole-sections' })
    .use(guard)
    .get(
      '/wells/:wellId/hole-sections',
      async ({ params }) => ok(await service.list(params.wellId)),
      {
        permission: 'report:read',
        params: wellParamsSchema,
        response: { 200: all },
      },
    )
    .post(
      '/wells/:wellId/hole-sections',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.wellId, body));
      },
      {
        permission: 'well:manage',
        params: wellParamsSchema,
        body: holeSectionCreateSchema,
        response: { 201: one },
      },
    )
    .get(
      '/wells/:wellId/geometry',
      async ({ params, query }) => ok(await service.geometry(params.wellId, query.td)),
      {
        permission: 'report:read',
        params: wellParamsSchema,
        query: geometryQuerySchema,
        response: { 200: z.object({ data: geometrySchema }) },
      },
    )
    .patch(
      '/hole-sections/:holeSectionId',
      async ({ params, body }) => ok(await service.update(params.holeSectionId, body)),
      {
        permission: 'well:manage',
        params: holeSectionParamsSchema,
        body: holeSectionUpdateSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/hole-sections/:holeSectionId',
      async ({ params, set }) => {
        await service.remove(params.holeSectionId);
        set.status = 204;
      },
      {
        permission: 'well:manage',
        params: holeSectionParamsSchema,
        response: { 204: z.undefined() },
      },
    );
};
