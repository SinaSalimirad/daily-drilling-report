import { describe, expect, it } from 'bun:test';
import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import ExcelJS from 'exceljs';
import {
  formatNumber,
  formatQuantity,
  fromDisplay,
  shownNumber,
  shownQuantity,
} from '@/lib/format';
import { dmrSheet, inventorySheet, type ReportExportInput, recapSheet } from './sheets';
import { writeWorkbook } from './write';

// Excel export (#204): the cells hold the numbers the page shows, in the project's units.

const workbook = UNIT_SYSTEM_PRESETS.workbook;
const vol = (bbl: number) => fromDisplay(bbl, 'volume', workbook);

const column = {
  start: vol(500),
  water: vol(20),
  chemical: vol(1),
  diesel: 0,
  received: 0,
  returned: 0,
  built: vol(21),
  losses: {},
  totalLosses: vol(5),
  end: vol(516),
};

const input = {
  report: {
    reportNo: 3,
    reportDate: '2026-08-03',
    revision: 2,
    bitDepth: 1520.5,
    td: 1520.5,
    tvd: 1500,
    dailyDrilled: 87.25,
    formation: 'Asmari',
    drillingRemarks: 'Drilled ahead',
    fluidRemarks: null,
    representatives: ['Rep A'],
    engineers: [],
  },
  well: { name: 'PYW-24 ST1' },
  project: { name: 'SAVA', operator: 'POGC', currency: '$', unitSystem: workbook },
  activities: { activities: [{ name: 'Drilling', hours: 20.5 }] },
  result: {
    source: 'snapshot',
    engineVersion: '1.0.0',
    payload: {
      inventory: {
        rows: [
          {
            projectProductId: 'p1',
            name: 'Barite',
            packageSize: 50,
            packageUnit: 'kg',
            origin: 'local',
            unitPrice: 12.345,
            initial: 100,
            received: 0,
            used: 12.5,
            finalStock: 87.5,
            dailyCost: 154.3125,
            usedSection: 30,
            usedMonthly: 30,
            usedCumulative: 30,
            keyStock: true,
          },
        ],
        costs: {
          daily: { total: 154.3125, local: 154.3125 },
          section: { total: 400, local: 400 },
          monthly: { total: 400, local: 400 },
          cumulative: { total: 400, local: 400 },
        },
        stockValue: 1080.1875,
      },
      volumes: {
        block: {
          hole: vol(300.123),
          string: vol(20),
          annulus: vol(280.123),
          belowBit: 0,
          active: vol(200),
          reserve: vol(16),
          totalCirculating: vol(500.12),
        },
        accounting: { daily: column, section: column, well: column },
      },
      samples: {
        samples: [
          {
            seq: 1,
            mudWeight: fromDisplay(75, 'density', workbook),
            funnelViscosity: 45,
            plasticViscosity: 0.018,
            yieldPoint: 9.5,
            apiFluidLoss: 5.2,
            chlorides: 60000,
            solids: 12.34,
          },
        ],
      },
    },
  },
} as unknown as ReportExportInput;

const find = (rows: unknown[][], label: string) => rows.find((row) => row[0] === label);

describe('shownNumber', () => {
  it('rounds exactly as formatNumber shows, without grouping', () => {
    for (const [value, decimals] of [
      [1234.5678, 2],
      [2.345, 2],
      [-2.345, 2],
      [0.0005, 3],
      [154.3125, 2],
    ] as const) {
      expect(shownNumber(value, decimals)).toBe(
        Number(formatNumber(value, decimals).replaceAll(',', '')),
      );
    }
  });

  it('shows a stored SI value in the display unit and decimals', () => {
    const stored = fromDisplay(75, 'density', workbook);
    expect(shownQuantity(stored, 'density', workbook)).toBe(75);
    expect(String(shownQuantity(vol(500.123), 'volume', workbook))).toBe(
      formatQuantity(vol(500.123), 'volume', workbook, { withUnit: false }),
    );
    expect(shownQuantity(null, 'volume', workbook)).toBeNull();
  });
});

describe('dmrSheet', () => {
  const sheet = dmrSheet(input);
  const block = (title: string) => sheet.blocks.find((b) => b.title.startsWith(title));

  it('has the heading of the print page', () => {
    expect(sheet.title).toEqual([
      'Daily drilling fluids report',
      'POGC · PYW-24 ST1 · SAVA',
      'Report 3 · 3 Aug 2026',
      'Submitted · revision 2 · engine 1.0.0',
    ]);
  });

  it('writes quantities in the project units, as on screen', () => {
    expect(find(block('Mud volume')?.rows ?? [], 'Hole')).toEqual(['Hole', 300.12, 'bbl']);
    const sample = block('Mud properties')?.rows[0];
    expect(sample?.[1]).toBe(75);
    expect(block('Mud properties')?.header?.[1]).toBe('Mud weight (PCF)');
    expect(find(block('Mud volume accounting')?.rows ?? [], 'End volume')).toEqual([
      'End volume',
      516,
      516,
      516,
    ]);
  });

  it('lists the products used with the cost of the day', () => {
    expect(block('Products used')?.rows).toEqual([['Barite', '50 kg', 12.5, 87.5, 154.31]]);
    expect(block('Cost')?.rows).toEqual([[154.31, 400, 400, 400]]);
  });
});

describe('inventorySheet and recapSheet', () => {
  it('lists every product of the inventory with the totals', () => {
    const sheet = inventorySheet(input);
    expect(sheet.name).toBe('Chem Inv.');
    expect(sheet.blocks[0]?.rows[0]).toEqual([
      'Barite',
      '50 kg',
      'Local',
      12.35,
      100,
      0,
      12.5,
      87.5,
      154.31,
      30,
      30,
      30,
      'yes',
    ]);
    expect(sheet.blocks[2]?.rows).toEqual([['Final stock × current price', 1080.19]]);
  });

  it('builds the recap for its scope', () => {
    const sheet = recapSheet({
      recap: {
        scope: 'well',
        sectionId: null,
        reports: { count: 3, first: 1, last: 3 },
        cost: { total: 400, local: 400 },
        products: [],
        accounting: column,
        operationHours: [{ activity: 'Drilling', hours: 60 }],
        averageRop: null,
      },
      well: input.well,
      project: input.project,
    } as never);
    expect(sheet.title[0]).toBe('Recap — well');
    expect(find(sheet.blocks[2]?.rows ?? [], 'Start volume')).toEqual(['Start volume', 500]);
  });
});

describe('writeWorkbook', () => {
  it('writes an .xlsx that reads back with the same sheets and numbers', async () => {
    const blob = await writeWorkbook([dmrSheet(input), inventorySheet(input)]);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const read = new ExcelJS.Workbook();
    await read.xlsx.load(await blob.arrayBuffer());
    expect(read.worksheets.map((ws) => ws.name)).toEqual(['DMR', 'Chem Inv.']);
    const values: unknown[] = [];
    read.getWorksheet('DMR')?.eachRow((row) => {
      values.push((row.values as unknown[]).slice(1));
    });
    expect(values).toContainEqual(['Hole', 300.12, 'bbl']);
  });
});
