import {
  reportCreateSchema,
  reportListQuerySchema,
  reportParamsSchema,
  reportSchema,
  wellParamsSchema,
} from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { list, ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { sectionsRepository } from '../sections/repository';
import { sectionsService } from '../sections/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { reportsRepository } from './repository';
import { reportsService } from './service';

// Reports are nested under their well for list / create, and addressed directly otherwise.

const one = z.object({ data: reportSchema });
const many = z.object({
  data: z.array(reportSchema),
  meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number() }),
});

export const reportsRoutes = (db: Db) => {
  const wells = wellsService(wellsRepository(db), projectsService(projectsRepository(db)));
  const service = reportsService(
    reportsRepository(db),
    wells,
    sectionsService(sectionsRepository(db), wells),
  );
  return new Elysia({ name: 'reports' })
    .use(guard)
    .get(
      '/wells/:wellId/reports',
      async ({ params, query }) => {
        const { data, meta } = await service.listByWell(params.wellId, query);
        return list(data, meta);
      },
      {
        permission: 'report:read',
        params: wellParamsSchema,
        query: reportListQuerySchema,
        response: { 200: many },
      },
    )
    .post(
      '/wells/:wellId/reports',
      async ({ params, body, set }) => {
        set.status = 201;
        return ok(await service.create(params.wellId, body));
      },
      {
        permission: 'report:write',
        params: wellParamsSchema,
        body: reportCreateSchema,
        response: { 201: one },
      },
    )
    .get('/reports/:reportId', async ({ params }) => ok(await service.get(params.reportId)), {
      permission: 'report:read',
      params: reportParamsSchema,
      response: { 200: one },
    })
    .delete(
      '/reports/:reportId',
      async ({ params, set }) => {
        await service.remove(params.reportId);
        set.status = 204;
      },
      {
        permission: 'report:delete',
        params: reportParamsSchema,
        response: { 204: z.undefined() },
      },
    );
};
