import { Elysia } from 'elysia';
import { z } from 'zod';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { healthRepository } from './repository';
import { healthService } from './service';

// GET /api/health — unversioned and public (docs/04-api-conventions.md).

const healthResponse = z.object({
  data: z.object({ status: z.literal('ok'), database: z.literal('up') }),
});

export const healthRoutes = (db: Db) => {
  const service = healthService(healthRepository(db));
  return new Elysia({ name: 'health' }).get('/health', async () => ok(await service.check()), {
    response: { 200: healthResponse },
  });
};
