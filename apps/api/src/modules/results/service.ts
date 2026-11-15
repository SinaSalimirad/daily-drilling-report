import { ENGINE_VERSION } from '@ddr/calc';
import type { ReportResult } from '@ddr/schemas';
import type { hydraulicsService } from '../hydraulics/service';
import type { inventoryService } from '../inventory/service';
import type { reportsService } from '../reports/service';
import type { samplesService } from '../samples/service';
import type { volumesService } from '../volumes/service';
import type { resultsRepository } from './repository';

export const resultsService = (
  repository: ReturnType<typeof resultsRepository>,
  reports: ReturnType<typeof reportsService>,
  inventory: ReturnType<typeof inventoryService>,
  volumes: ReturnType<typeof volumesService>,
  samples: ReturnType<typeof samplesService>,
  hydraulics: ReturnType<typeof hydraulicsService>,
) => {
  /** Everything the printed report shows that is calculated, from the data as it is now. */
  const calculate = async (reportId: string) => ({
    inventory: await inventory.get(reportId),
    volumes: await volumes.get(reportId),
    samples: await samples.get(reportId),
    hydraulics: await hydraulics.get(reportId, 'virtual'),
  });

  const write = async (reportId: string) => {
    const report = await reports.get(reportId);
    const payload = await calculate(reportId);
    await repository.upsert({
      reportId,
      revision: report.revision,
      engineVersion: ENGINE_VERSION,
      payload,
    });
    return { report, payload };
  };

  return {
    /**
     * Writes the snapshot of a submitted report and marks the results of later reports of
     * the well stale (docs/03, "Editing a submitted report").
     */
    async snapshot(reportId: string): Promise<void> {
      const { report } = await write(reportId);
      await repository.markLaterStale(report.wellId, report.reportNo);
    },

    /**
     * The results of a report: a draft is calculated live; a submitted report returns its
     * snapshot, recalculated first when it is stale or missing.
     */
    async get(reportId: string): Promise<ReportResult> {
      const report = await reports.get(reportId);
      if (report.status === 'draft') {
        return {
          source: 'live',
          revision: report.revision,
          engineVersion: ENGINE_VERSION,
          isStale: false,
          payload: await calculate(reportId),
        };
      }
      const row = await repository.find(reportId);
      if (!row || row.isStale) {
        const { payload } = await write(reportId);
        return {
          source: 'snapshot',
          revision: report.revision,
          engineVersion: ENGINE_VERSION,
          isStale: false,
          payload,
        };
      }
      return {
        source: 'snapshot',
        revision: row.revision,
        engineVersion: row.engineVersion,
        isStale: false,
        payload: row.payload,
      };
    },
  };
};
