import type { DashboardConsumption, ProductUnit, UnitSystem } from '@ddr/schemas';

// Consumption dashboard (#217, #220): the API's daily rows as matrices per well, in packages:
// product × month (used, received; in the user's calendar through `monthOf`), the well total
// (used, received, returned), and product × section (used). No cost. Pure, so the sums can be
// tested against the inventory's own monthly and section usage.

export type Moves = { used: number; received: number; returned: number };

export type ProductRow = {
  projectProductId: string;
  name: string;
  packageSize: number;
  packageUnit: ProductUnit;
  /** By month key. */
  byMonth: Record<string, Moves>;
  /** Packages used, by section id. */
  bySection: Record<string, number>;
  total: Moves;
};

export type Column = { key: string; label: string };

export type WellSummary = {
  id: string;
  name: string;
  /** Months with a move, oldest first. */
  months: Column[];
  /** Sections with packages used, in drilling order. */
  sections: Column[];
  /** Products with a move in the well, by name. */
  products: ProductRow[];
};

export type ProjectSummary = { id: string; name: string; wells: WellSummary[] };

export type Labels = {
  /** ISO date → month key, sortable (`2026-07`, or a Jalali month). */
  monthOf: (isoDate: string) => string;
  monthLabel: (key: string) => string;
  /** `n` is the position of the section in its well, from 1. */
  sectionLabel: (n: number, holeSize: number, system: UnitSystem) => string;
};

const none = (): Moves => ({ used: 0, received: 0, returned: 0 });

function add(target: Moves, row: Moves) {
  target.used += row.used;
  target.received += row.received;
  target.returned += row.returned;
}

export function summarize(data: DashboardConsumption, labels: Labels): ProjectSummary[] {
  const products = new Map(data.products.map((p) => [p.projectProductId, p]));
  return data.projects.map((project) => ({
    id: project.id,
    name: project.name,
    wells: data.wells
      .filter((well) => well.projectId === project.id)
      .map((well): WellSummary => {
        const rows = data.usage.filter((row) => row.wellId === well.id);
        const byProduct = new Map<string, ProductRow>();
        for (const row of rows) {
          const product = products.get(row.projectProductId);
          const line = byProduct.get(row.projectProductId) ?? {
            projectProductId: row.projectProductId,
            name: product?.name ?? 'Unknown product',
            packageSize: product?.packageSize ?? 0,
            packageUnit: product?.packageUnit ?? 'kg',
            byMonth: {},
            bySection: {},
            total: none(),
          };
          const month = labels.monthOf(row.reportDate);
          line.byMonth[month] ??= none();
          add(line.byMonth[month], row);
          line.bySection[row.sectionId] = (line.bySection[row.sectionId] ?? 0) + row.used;
          add(line.total, row);
          byProduct.set(row.projectProductId, line);
        }
        const used = new Set(rows.filter((row) => row.used !== 0).map((row) => row.sectionId));
        const sections = data.sections
          .filter((s) => s.wellId === well.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((s, index) => ({
            key: s.id,
            label: labels.sectionLabel(index + 1, s.holeSize, project.unitSystem),
          }))
          .filter((s) => used.has(s.key));
        return {
          id: well.id,
          name: well.name,
          months: [...new Set(rows.map((row) => labels.monthOf(row.reportDate)))]
            .sort()
            .map((key) => ({ key, label: labels.monthLabel(key) })),
          sections,
          products: [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name)),
        };
      }),
  }));
}
