import {
  sectionCreateSchema,
  sectionParamsSchema,
  sectionSchema,
  sectionUpdateSchema,
  wellParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { lookupsRepository } from '../lookups/repository';
import { lookupsService } from '../lookups/service';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { sectionsRepository } from './repository';
import { sectionsService } from './service';

// Sections of a well: a short list, returned whole in order (docs/04).

const one = z.object({ data: sectionSchema });
const all = z.object({ data: z.array(sectionSchema) });

export const sectionsRoutes = (db: Db) => {
  const service = sectionsService(
    sectionsRepository(db),
    wellsService(wellsRepository(db), projectsService(projectsRepository(db))),
    lookupsService(lookupsRepository(db)),
  );
  return new Elysia({ name: 'sections' })
    .use(guard)
    .get(
      '/wells/:wellId/sections',
      async ({ params }) => ok(await service.listByWell(params.wellId)),
      {
        permission: 'report:read',
        params: wellParamsSchema,
        response: { 200: all },
      },
    )
    .post(
      '/wells/:wellId/sections',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.wellId, body));
      },
      {
        permission: 'well:manage',
        params: wellParamsSchema,
        body: sectionCreateSchema,
        response: { 201: one },
      },
    )
    .get('/sections/:sectionId', async ({ params }) => ok(await service.get(params.sectionId)), {
      permission: 'report:read',
      params: sectionParamsSchema,
      response: { 200: one },
    })
    .patch(
      '/sections/:sectionId',
      async ({ params, body }) => ok(await service.update(params.sectionId, body)),
      {
        permission: 'well:manage',
        params: sectionParamsSchema,
        body: sectionUpdateSchema,
        response: { 200: one },
      },
    )
    .delete(
      '/sections/:sectionId',
      async ({ params, set }) => {
        await service.remove(params.sectionId);
        set.status = 204;
      },
      {
        permission: 'well:manage',
        params: sectionParamsSchema,
        response: { 204: z.undefined() },
      },
    );
};
