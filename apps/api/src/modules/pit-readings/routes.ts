import { pitReadingsPutSchema, pitReadingsSchema, reportParamsSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { lookupsRepository } from '../lookups/repository';
import { lookupsService } from '../lookups/service';
import { pitsRepository } from '../pits/repository';
import { pitsService } from '../pits/service';
import { projectsRepository } from '../projects/repository';
import { projectsService } from '../projects/service';
import { reportsRepository } from '../reports/repository';
import { reportsService } from '../reports/service';
import { sectionsRepository } from '../sections/repository';
import { sectionsService } from '../sections/service';
import { wellsRepository } from '../wells/repository';
import { wellsService } from '../wells/service';
import { pitReadingsRepository } from './repository';
import { pitReadingsService } from './service';

const one = z.object({ data: pitReadingsSchema });

export const pitReadingsRoutes = (db: Db) => {
  const projects = projectsService(projectsRepository(db));
  const wells = wellsService(wellsRepository(db), projects);
  const reports = reportsService(
    reportsRepository(db),
    wells,
    sectionsService(sectionsRepository(db), wells),
  );
  const service = pitReadingsService(
    pitReadingsRepository(db),
    reports,
    wells,
    pitsService(pitsRepository(db), projects),
    lookupsService(lookupsRepository(db)),
  );
  return new Elysia({ name: 'pit-readings' })
    .use(guard)
    .get(
      '/reports/:reportId/pit-readings',
      async ({ params }) => ok(await service.get(params.reportId)),
      { permission: 'report:read', params: reportParamsSchema, response: { 200: one } },
    )
    .put(
      '/reports/:reportId/pit-readings',
      async ({ params, body }) => ok(await service.replace(params.reportId, body)),
      {
        permission: 'report:write',
        params: reportParamsSchema,
        body: pitReadingsPutSchema,
        response: { 200: one },
      },
    );
};
