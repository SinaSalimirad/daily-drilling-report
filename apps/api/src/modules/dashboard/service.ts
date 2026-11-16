import type { DashboardConsumption } from '@ddr/schemas';
import type { dashboardRepository } from './repository';

export type DashboardViewer = {
  /** Only the wells assigned to this user (engineer, client; docs/07 "Scope"). */
  memberId?: string;
  /** A client counts submitted reports only (docs/07). */
  submittedOnly: boolean;
};

export const dashboardService = (repository: ReturnType<typeof dashboardRepository>) => ({
  /** Chemical usage of every well the viewer may see, one row per report and product. */
  async consumption({ memberId, submittedOnly }: DashboardViewer): Promise<DashboardConsumption> {
    const wellRows = await repository.visibleWells(memberId);
    const wellIds = wellRows.map((w) => w.id);
    const projects = [
      ...new Map(
        wellRows.map((w) => [
          w.projectId,
          { id: w.projectId, name: w.projectName, currency: w.currency },
        ]),
      ).values(),
    ];
    const [sections, products, usage] = await Promise.all([
      repository.sectionsOf(wellIds),
      repository.productsOf(projects.map((p) => p.id)),
      repository.usageOf(wellIds, submittedOnly),
    ]);
    return {
      projects,
      wells: wellRows.map((w) => ({ id: w.id, projectId: w.projectId, name: w.name })),
      sections,
      products,
      usage: usage.map(({ unitPrice, ...row }) => ({ ...row, cost: row.used * unitPrice })),
    };
  },
});
