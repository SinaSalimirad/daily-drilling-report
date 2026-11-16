import type { DashboardConsumption, ProductOrigin, ProductUnit, UnitSystem } from '@ddr/schemas';

// Consumption dashboard (#217): the daily usage rows of the API grouped per project and well,
// by month (in the user's calendar, through `monthOf`) and by drilling section. Pure, so the
// sums can be tested against the inventory's own monthly and section costs.

export type ProductLine = {
  projectProductId: string;
  name: string;
  packageSize: number;
  packageUnit: ProductUnit;
  used: number;
  cost: number;
};

export type Group = {
  key: string;
  label: string;
  total: number;
  /** Cost of products of local origin. */
  local: number;
  /** Most expensive first. */
  products: ProductLine[];
};

export type WellSummary = {
  id: string;
  name: string;
  total: number;
  local: number;
  months: Group[];
  sections: Group[];
};

export type ProjectSummary = {
  id: string;
  name: string;
  currency: string;
  unitSystem: UnitSystem;
  total: number;
  local: number;
  wells: WellSummary[];
};

export type Labels = {
  /** ISO date → month key, sortable (`2026-07`, or a Jalali month). */
  monthOf: (isoDate: string) => string;
  monthLabel: (key: string) => string;
  /** `n` is the position of the section in its well, from 1. */
  sectionLabel: (n: number, holeSize: number, system: UnitSystem) => string;
};

type Row = DashboardConsumption['usage'][number];
type Product = DashboardConsumption['products'][number];

function group(
  rows: Row[],
  keyOf: (row: Row) => string,
  order: string[],
  labelOf: (key: string) => string,
  products: Map<string, Product>,
): Group[] {
  const byKey = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  return order
    .filter((key) => byKey.has(key))
    .map((key) => {
      const lines = new Map<string, ProductLine>();
      let local = 0;
      for (const row of byKey.get(key) ?? []) {
        const product = products.get(row.projectProductId);
        if (product?.origin === ('local' satisfies ProductOrigin)) local += row.cost;
        const line = lines.get(row.projectProductId) ?? {
          projectProductId: row.projectProductId,
          name: product?.name ?? 'Unknown product',
          packageSize: product?.packageSize ?? 0,
          packageUnit: product?.packageUnit ?? 'kg',
          used: 0,
          cost: 0,
        };
        line.used += row.used;
        line.cost += row.cost;
        lines.set(row.projectProductId, line);
      }
      const productLines = [...lines.values()].sort((a, b) => b.cost - a.cost);
      return {
        key,
        label: labelOf(key),
        total: productLines.reduce((sum, line) => sum + line.cost, 0),
        local,
        products: productLines,
      };
    });
}

export function summarize(data: DashboardConsumption, labels: Labels): ProjectSummary[] {
  const products = new Map(data.products.map((p) => [p.projectProductId, p]));
  return data.projects.map((project) => {
    const wells = data.wells
      .filter((well) => well.projectId === project.id)
      .map((well): WellSummary => {
        const rows = data.usage.filter((row) => row.wellId === well.id);
        const sections = data.sections
          .filter((s) => s.wellId === well.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const sectionLabels = new Map(
          sections.map((s, index) => [
            s.id,
            labels.sectionLabel(index + 1, s.holeSize, project.unitSystem),
          ]),
        );
        const months = [...new Set(rows.map((row) => labels.monthOf(row.reportDate)))].sort();
        const byMonth = group(
          rows,
          (row) => labels.monthOf(row.reportDate),
          months,
          labels.monthLabel,
          products,
        );
        const bySection = group(
          rows,
          (row) => row.sectionId,
          sections.map((s) => s.id),
          (id) => sectionLabels.get(id) ?? 'Section',
          products,
        );
        return {
          id: well.id,
          name: well.name,
          total: byMonth.reduce((sum, g) => sum + g.total, 0),
          local: byMonth.reduce((sum, g) => sum + g.local, 0),
          months: byMonth,
          sections: bySection,
        };
      });
    return {
      id: project.id,
      name: project.name,
      currency: project.currency,
      unitSystem: project.unitSystem,
      total: wells.reduce((sum, w) => sum + w.total, 0),
      local: wells.reduce((sum, w) => sum + w.local, 0),
      wells,
    };
  });
}
