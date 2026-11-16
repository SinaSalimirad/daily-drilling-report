import { dashboardConsumptionSchema } from '@ddr/schemas';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { listScopeOf } from '../../auth/scope';
import type { Db } from '../../db/client';
import { ok } from '../../lib/response';
import { type GuardContext, guard } from '../../plugins/guard';
import { dashboardRepository } from './repository';
import { dashboardService } from './service';

// Home-page dashboard (v1.1.0): packages used, received and returned in the wells the user may
// see. No money in it (#220), so the permission is the one of reading a report.
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
      permission: 'report:read',
      response: { 200: z.object({ data: dashboardConsumptionSchema }) },
    },
  );
};
