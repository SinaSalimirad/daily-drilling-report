import type { ReportActivities, ReportActivitiesPut } from '@ddr/schemas';
import { ValidationError } from '../../lib/errors';
import type { Warning } from '../../lib/response';
import type { lookupsService } from '../lookups/service';
import type { reportsService } from '../reports/service';
import type { reportActivitiesRepository } from './repository';

const DAY_HOURS = 24;

export const reportActivitiesService = (
  repository: ReturnType<typeof reportActivitiesRepository>,
  reports: ReturnType<typeof reportsService>,
  lookups: ReturnType<typeof lookupsService>,
) => {
  const read = async (reportId: string): Promise<ReportActivities> => {
    const rows = await repository.list(reportId);
    const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
    return {
      activities: rows,
      totalHours,
      presentActivity: rows[rows.length - 1]?.name ?? null,
    };
  };

  /** A day that is not 24 h is a warning, not an error (docs/05). */
  const warningsFor = (totalHours: number): Warning[] =>
    Math.abs(totalHours - DAY_HOURS) > 1e-9
      ? [
          {
            code: 'ACTIVITY_HOURS_NOT_24',
            message: `Activities add up to ${totalHours} h, not 24 h`,
            details: { totalHours },
          },
        ]
      : [];

  return {
    async get(reportId: string) {
      await reports.get(reportId);
      const data = await read(reportId);
      return { data, warnings: warningsFor(data.totalHours) };
    },

    async replace(reportId: string, input: ReportActivitiesPut) {
      await reports.get(reportId);
      const unknown = await lookups.unknownActivityIds([
        ...new Set(input.activities.map((row) => row.activityId)),
      ]);
      if (unknown.length > 0) {
        throw new ValidationError(
          input.activities.flatMap((row, index) =>
            unknown.includes(row.activityId)
              ? [{ path: `body.activities.${index}.activityId`, message: 'Unknown activity' }]
              : [],
          ),
        );
      }
      await repository.replace(reportId, input.activities);
      const data = await read(reportId);
      return { data, warnings: warningsFor(data.totalHours) };
    },
  };
};
