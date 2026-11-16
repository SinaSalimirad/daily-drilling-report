import { can } from '@ddr/schemas';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { bhaRuns, dailyReports, drillingSections, holeSections, wellMembers } from '../db/schema';
import { ForbiddenError } from '../lib/errors';
import type { ScopeCheck } from '../plugins/guard';
import type { SessionUser } from './session';

// docs/07, "Scope": an engineer or a client works only on assigned wells (`well_members`);
// admin and coordinator are not limited. The permission was already checked from the role;
// this step needs the well of the record a route touches, found from its path parameters.

type Target = { wellId: string; report?: { status: 'draft' | 'submitted' } };

async function targetOf(
  db: Db,
  params: Record<string, string | undefined>,
): Promise<Target | null> {
  if (params.wellId) return { wellId: params.wellId };
  if (params.reportId) {
    const [row] = await db
      .select({ wellId: dailyReports.wellId, status: dailyReports.status })
      .from(dailyReports)
      .where(eq(dailyReports.id, params.reportId));
    return row ? { wellId: row.wellId, report: { status: row.status } } : null;
  }
  const lookups: [string | undefined, () => Promise<{ wellId: string } | undefined>][] = [
    [
      params.sectionId,
      async () =>
        (
          await db
            .select({ wellId: drillingSections.wellId })
            .from(drillingSections)
            .where(eq(drillingSections.id, params.sectionId as string))
        )[0],
    ],
    [
      params.holeSectionId,
      async () =>
        (
          await db
            .select({ wellId: holeSections.wellId })
            .from(holeSections)
            .where(eq(holeSections.id, params.holeSectionId as string))
        )[0],
    ],
    [
      params.bhaRunId,
      async () =>
        (
          await db
            .select({ wellId: bhaRuns.wellId })
            .from(bhaRuns)
            .where(eq(bhaRuns.id, params.bhaRunId as string))
        )[0],
    ],
  ];
  for (const [id, find] of lookups) {
    if (id) {
      const row = await find();
      return row ? { wellId: row.wellId } : null;
    }
  }
  return null;
}

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Admin and coordinator see every well; the other roles only the wells assigned to them. */
const seesEveryWell = (user: SessionUser) => user.role === 'admin' || user.role === 'coordinator';

/**
 * The user whose `well_members` limit a list (the wells of a project, the projects), or
 * `undefined` when the list is not limited (KI-008, #183).
 */
export const listScopeOf = (user: SessionUser | null | undefined): string | undefined =>
  user && !seesEveryWell(user) ? user.id : undefined;

export const scopeCheckFor =
  (db: Db, user: SessionUser | null): ScopeCheck =>
  async (permission, params, method) => {
    if (!user) return;
    const target = await targetOf(db, params);
    // A report of the role's own kind of edit: the coordinator may only touch submitted ones.
    if (permission === 'report:write' && !can(user.role, 'report:write')) {
      if (target?.report?.status !== 'submitted') throw new ForbiddenError();
    }
    if (
      permission === 'report:write' &&
      WRITES.has(method) &&
      target?.report?.status === 'submitted' &&
      !can(user.role, 'report:edit_submitted')
    ) {
      throw new ForbiddenError('A submitted report can only be edited by a role that may');
    }
    if (seesEveryWell(user) || !target) return;
    const [member] = await db
      .select({ id: wellMembers.id })
      .from(wellMembers)
      .where(and(eq(wellMembers.userId, user.id), eq(wellMembers.wellId, target.wellId)));
    if (!member) throw new ForbiddenError('This well is not assigned to you');
    // A client reads submitted reports only.
    if (user.role === 'client' && target.report && target.report.status !== 'submitted') {
      throw new ForbiddenError('A client sees submitted reports only');
    }
  };
