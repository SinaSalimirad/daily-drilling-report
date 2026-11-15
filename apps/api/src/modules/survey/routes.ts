import { surveyPutSchema, surveySchema, wellParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { surveyRepository } from './repository';
import { surveyService } from './service';

const one = z.object({ data: surveySchema });

export const surveyRoutes = (db: Db) => {
  const service = surveyService(
    surveyRepository(db),
    wellsService(wellsRepository(db), projectsService(projectsRepository(db))),
  );
  return new Elysia({ name: 'survey' })
    .use(guard)
    .get('/wells/:wellId/survey', async ({ params }) => ok(await service.get(params.wellId)), {
      permission: 'report:read',
      params: wellParamsSchema,
      response: { 200: one },
    })
    .put(
      '/wells/:wellId/survey',
      async ({ params, body }) => ok(await service.replace(params.wellId, body)),
      {
        permission: 'well:manage',
        params: wellParamsSchema,
        body: surveyPutSchema,
        response: { 200: one },
      },
    );
};
