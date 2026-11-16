import { dashboardConsumptionSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { listScopeOf } from '../../auth/scope';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { type GuardContext, guard } from '../../plugins/guard';
import { dashboardRepository } from './repository';
import { dashboardService } from './service';

// Home-page dashboard (v1.1.0): chemical consumption of the wells the user may see.
export const dashboardRoutes = (db: Db) => {
  const service = dashboardService(dashboardRepository(db));
  return new Elysia({ name: 'dashboard' }).use(guard).get(
    '/dashboard/consumption',
    async (context) => {
      const user = (context as unknown as GuardContext).authUser;
      return ok(
        await service.consumption({
          memberId: listScopeOf(user),
          submittedOnly: user?.role === 'client',
        }),
      );
    },
    {
      permission: 'cost:read',
      response: { 200: z.object({ data: dashboardConsumptionSchema }) },
    },
  );
};
