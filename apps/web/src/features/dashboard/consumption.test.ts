import { describe, expect, it } from 'bun:test';
import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import type { DashboardConsumption } from '@ddr/schemas';
import { formatMonth, monthKey } from '@/lib/format';
import { summarize } from './consumption';

const P = '00000000-0000-4000-8000-0000000000a1';
const W1 = '00000000-0000-4000-8000-0000000000b1';
const W2 = '00000000-0000-4000-8000-0000000000b2';
const S1 = '00000000-0000-4000-8000-0000000000c1';
const S2 = '00000000-0000-4000-8000-0000000000c2';
const BARITE = '00000000-0000-4000-8000-0000000000d1';
const GEL = '00000000-0000-4000-8000-0000000000d2';

const data: DashboardConsumption = {
  projects: [{ id: P, name: 'SAVA', currency: '$', unitSystem: UNIT_SYSTEM_PRESETS.workbook }],
  wells: [
    { id: W1, projectId: P, name: 'PYW-24' },
    { id: W2, projectId: P, name: 'PYW-25' },
  ],
  sections: [
    { id: S2, wellId: W1, holeSize: 0.2159, sortOrder: 2 },
    { id: S1, wellId: W1, holeSize: 0.3112, sortOrder: 1 },
  ],
  products: [
    {
      projectProductId: BARITE,
      projectId: P,
      name: 'Barite',
      packageSize: 25,
      packageUnit: 'kg',
      origin: 'local',
    },
    {
      projectProductId: GEL,
      projectId: P,
      name: 'Gel',
      packageSize: 50,
      packageUnit: 'kg',
      origin: 'foreign',
    },
  ],
  usage: [
    {
      wellId: W1,
      sectionId: S1,
      reportDate: '2026-07-30',
      projectProductId: BARITE,
      used: 4,
      cost: 40,
    },
    {
      wellId: W1,
      sectionId: S1,
      reportDate: '2026-07-31',
      projectProductId: GEL,
      used: 2,
      cost: 30.5,
    },
    {
      wellId: W1,
      sectionId: S1,
      reportDate: '2026-07-31',
      projectProductId: BARITE,
      used: 1,
      cost: 10,
    },
    {
      wellId: W1,
      sectionId: S2,
      reportDate: '2026-08-01',
      projectProductId: BARITE,
      used: 3,
      cost: 30,
    },
  ],
};

const labels = {
  monthOf: monthKey,
  monthLabel: formatMonth,
  sectionLabel: (n: number) => `Section ${n}`,
};

describe('summarize', () => {
  const [project] = summarize(data, labels);
  const [w1, w2] = project?.wells ?? [];

  it('groups a well by month, oldest first, with the products behind each total', () => {
    expect(w1?.months.map((m) => [m.label, m.total, m.local])).toEqual([
      ['Jul 2026', 80.5, 50],
      ['Aug 2026', 30, 30],
    ]);
    expect(w1?.months[0]?.products.map((p) => [p.name, p.used, p.cost])).toEqual([
      ['Barite', 5, 50],
      ['Gel', 2, 30.5],
    ]);
  });

  it('groups by section in drilling order', () => {
    expect(w1?.sections.map((s) => [s.label, s.total])).toEqual([
      ['Section 1', 80.5],
      ['Section 2', 30],
    ]);
  });

  it('adds up wells and the project, and keeps a well without usage', () => {
    expect([w1?.total, w1?.local]).toEqual([110.5, 80]);
    expect(w2).toMatchObject({ name: 'PYW-25', total: 0, months: [], sections: [] });
    expect([project?.total, project?.local]).toEqual([110.5, 80]);
  });
});
