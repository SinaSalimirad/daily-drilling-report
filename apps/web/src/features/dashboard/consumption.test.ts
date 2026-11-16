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

function row(
  sectionId: string,
  reportDate: string,
  projectProductId: string,
  used: number,
  received: number,
  returned: number,
) {
  return { wellId: W1, sectionId, reportDate, projectProductId, used, received, returned };
}

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
    row(S1, '2026-07-30', BARITE, 4, 100, 0),
    row(S1, '2026-07-31', GEL, 2, 20, 0),
    row(S1, '2026-07-31', BARITE, 1, 0, 0),
    row(S2, '2026-08-01', BARITE, 3, 0, 5),
    row(S2, '2026-08-02', GEL, 0, 10, 0),
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
  const barite = w1?.products.find((p) => p.name === 'Barite');
  const gel = w1?.products.find((p) => p.name === 'Gel');

  it('makes a product × month matrix of used and received, oldest month first', () => {
    expect(w1?.months).toEqual([
      { key: '2026-07', label: 'Jul 2026' },
      { key: '2026-08', label: 'Aug 2026' },
    ]);
    expect(w1?.products.map((p) => p.name)).toEqual(['Barite', 'Gel']);
    expect(barite?.byMonth).toEqual({
      '2026-07': { used: 5, received: 100, returned: 0 },
      '2026-08': { used: 3, received: 0, returned: 5 },
    });
    expect(gel?.byMonth['2026-08']).toEqual({ used: 0, received: 10, returned: 0 });
  });

  it('gives the well total of used, received and returned per product', () => {
    expect(barite?.total).toEqual({ used: 8, received: 100, returned: 5 });
    expect(gel?.total).toEqual({ used: 2, received: 30, returned: 0 });
  });

  it('makes a product × section matrix of used, in drilling order, only sections with use', () => {
    expect(w1?.sections).toEqual([
      { key: S1, label: 'Section 1' },
      { key: S2, label: 'Section 2' },
    ]);
    expect(barite?.bySection).toEqual({ [S1]: 5, [S2]: 3 });
    expect(gel?.bySection).toEqual({ [S1]: 2, [S2]: 0 });
  });

  it('keeps a well without moves, with empty matrices', () => {
    expect(w2).toMatchObject({ name: 'PYW-25', months: [], sections: [], products: [] });
  });
});
