import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { guard } from '../../plugins/guard';
import { lookupsRepository } from './repository';
import { lookupsService } from './service';

// GET /api/v1/lookups — all open lists in one response; small fixed collections are
// returned whole, without `meta` (docs/04).

const item = z.object({ id: z.uuid(), name: z.string() });
const lookupsResponse = z.object({
  data: z.object({
    activities: z.array(item),
    sampleSources: z.array(item),
    fluidSystems: z.array(item),
    pitMudTypes: z.array(item),
  }),
});

export const lookupsRoutes = (db: Db) => {
  const service = lookupsService(lookupsRepository(db));
  return new Elysia({ name: 'lookups' })
    .use(guard)
    .get('/lookups', async () => ok(await service.all()), {
      permission: 'report:read',
      response: { 200: lookupsResponse },
    });
};
