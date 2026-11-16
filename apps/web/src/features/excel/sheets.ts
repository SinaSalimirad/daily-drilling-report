import {
  type Hydraulics,
  type Inventory,
  type Project,
  type Quantity,
  type Recap,
  type Report,
  type ReportActivities,
  type ReportResult,
  type SamplesResult,
  type UnitSystem,
  VOLUME_LOSS_ITEMS,
  type VolumesResult,
  type Well,
} from '@ddr/schemas';
import { formatDate, quantityLabel, shownNumber, shownQuantity } from '@/lib/format';
import { enumLabel } from '@/lib/labels';

// Excel export (v1.1.0, #204): what a file holds, as plain rows, built from the same data and
// the same `lib/format.ts` conversions as the print pages. Numbers are the numbers on screen
// (display unit, display decimals); `write.ts` turns these rows into an .xlsx file.

export type Cell = string | number | null;
export type Block = { title: string; header?: string[]; rows: Cell[][] };
export type Sheet = { name: string; title: string[]; blocks: Block[] };

/** The data of the report print page. */
export type ReportExportInput = {
  report: Report;
  well: Well;
  project: Project;
  activities: ReportActivities;
  result: ReportResult;
};

type Payload = {
  inventory: Inventory;
  volumes: VolumesResult;
  samples: SamplesResult;
  hydraulics: Hydraulics;
};

const quantityOf = (system: UnitSystem) => (si: number | null | undefined, quantity: Quantity) =>
  shownQuantity(si, quantity, system);
const unitOf = (system: UnitSystem) => (quantity: Quantity) => quantityLabel(system, quantity);

function heading(input: ReportExportInput, title: string): string[] {
  const { report, well, project, result } = input;
  return [
    title,
    `${project.operator} · ${well.name} · ${project.name}`,
    `Report ${report.reportNo} · ${formatDate(report.reportDate)}`,
    `${result.source === 'snapshot' ? 'Submitted' : 'Draft'} · revision ${report.revision} · engine ${result.engineVersion}`,
  ];
}

/** Sheet `DMR`: the blocks of the report print page. */
export function dmrSheet(input: ReportExportInput): Sheet {
  const { report: r, project, activities } = input;
  const p = input.result.payload as unknown as Payload;
  const system = project.unitSystem;
  const q = quantityOf(system);
  const unit = unitOf(system);
  const currency = project.currency;
  const block = p.volumes.block;
  const columns = [
    p.volumes.accounting.daily,
    p.volumes.accounting.section,
    p.volumes.accounting.well,
  ];
  const accountingRow = (label: string, pick: (c: (typeof columns)[number]) => number): Cell[] => [
    label,
    ...columns.map((c) => q(pick(c), 'volume')),
  ];

  return {
    name: 'DMR',
    title: heading(input, 'Daily drilling fluids report'),
    blocks: [
      {
        title: 'Depths',
        header: ['Item', 'Value', 'Unit'],
        rows: [
          ['Bit depth', q(r.bitDepth, 'depth'), unit('depth')],
          ['TD', q(r.td, 'depth'), unit('depth')],
          ['TVD', q(r.tvd, 'depth'), unit('depth')],
          ['Drilled today', q(r.dailyDrilled, 'depth'), unit('depth')],
          ['Formation', r.formation, null],
        ],
      },
      {
        title: 'Mud volume',
        header: ['Item', 'Value', 'Unit'],
        rows: (
          [
            ['Hole', block.hole],
            ['String', block.string],
            ['Annulus', block.annulus],
            ['Below bit', block.belowBit],
            ['Active', block.active],
            ['Reserve', block.reserve],
            ['Total circulating', block.totalCirculating],
          ] as const
        ).map(([label, si]) => [label, q(si, 'volume'), unit('volume')]),
      },
      {
        title: 'Mud properties',
        header: [
          'Sample',
          `Mud weight (${unit('density')})`,
          'Funnel (s/qt)',
          `PV (${unit('plasticViscosity')})`,
          `YP (${unit('yieldStress')})`,
          'API FL',
          `Chlorides (${unit('chlorides')})`,
          'Solids %',
        ],
        rows: p.samples.samples.map((s) => [
          s.seq,
          q(s.mudWeight, 'density'),
          s.funnelViscosity === null ? null : shownNumber(s.funnelViscosity, 0),
          q(s.plasticViscosity, 'plasticViscosity'),
          q(s.yieldPoint, 'yieldStress'),
          s.apiFluidLoss === null ? null : shownNumber(s.apiFluidLoss, 1),
          q(s.chlorides, 'chlorides'),
          s.solids === null ? null : shownNumber(s.solids, 1),
        ]),
      },
      {
        title: 'Products used last 24 h',
        header: ['Product', 'Package', 'Used', 'Final stock', `Cost (${currency})`],
        rows: [
          ...p.inventory.rows
            .filter((row) => row.used > 0)
            .map((row) => [
              row.name,
              `${shownNumber(row.packageSize, 3)} ${row.packageUnit}`,
              shownNumber(row.used, 3),
              shownNumber(row.finalStock, 3),
              shownNumber(row.dailyCost, 2),
            ]),
        ],
      },
      {
        title: `Cost (${currency})`,
        header: ['Today', 'Section', 'Month', 'Well'],
        rows: [
          [
            p.inventory.costs.daily.total,
            p.inventory.costs.section.total,
            p.inventory.costs.monthly.total,
            p.inventory.costs.cumulative.total,
          ].map((value) => shownNumber(value, 2)),
        ],
      },
      {
        title: `Mud volume accounting (${unit('volume')})`,
        header: ['Item', 'Daily', 'Section', 'Well'],
        rows: [
          accountingRow('Start volume', (c) => c.start),
          accountingRow('Built', (c) => c.built),
          accountingRow('Received', (c) => c.received),
          accountingRow('Return', (c) => c.returned),
          accountingRow('Total losses', (c) => c.totalLosses),
          accountingRow('End volume', (c) => c.end),
        ],
      },
      {
        title: 'Activities',
        header: ['Activity', 'Hours'],
        rows: activities.activities.map((a) => [a.name, shownNumber(a.hours, 2)]),
      },
      {
        title: 'Remarks',
        rows: [
          ['Drilling', r.drillingRemarks],
          ['Fluid', r.fluidRemarks],
          ['Representatives', r.representatives.join(', ') || null],
          ['Fluids engineers', r.engineers.join(', ') || null],
        ],
      },
    ],
  };
}

/** Sheet `Chem Inv.`: the inventory print page. */
export function inventorySheet(input: ReportExportInput): Sheet {
  const { inventory } = input.result.payload as unknown as Payload;
  const currency = input.project.currency;
  const { costs } = inventory;
  const qty = (value: number) => shownNumber(value, 3);
  const money = (value: number) => shownNumber(value, 2);
  return {
    name: 'Chem Inv.',
    title: heading(input, 'Chemical inventory'),
    blocks: [
      {
        title: 'Products',
        header: [
          'Product',
          'Package',
          'Origin',
          `Price (${currency})`,
          'Initial',
          'Received',
          'Used',
          'Final stock',
          `Cost today (${currency})`,
          'Used section',
          'Used month',
          'Used well',
          'Key stock',
        ],
        rows: inventory.rows.map((row) => [
          row.name,
          `${qty(row.packageSize)} ${row.packageUnit}`,
          enumLabel(row.origin),
          money(row.unitPrice),
          qty(row.initial),
          qty(row.received),
          qty(row.used),
          qty(row.finalStock),
          money(row.dailyCost),
          qty(row.usedSection),
          qty(row.usedMonthly),
          qty(row.usedCumulative),
          row.keyStock ? 'yes' : null,
        ]),
      },
      {
        title: `Cost (${currency})`,
        header: ['', 'Today', 'Section', 'Month', 'Well'],
        rows: (['total', 'local'] as const).map((key) => [
          key === 'total' ? 'Total' : 'Local',
          ...[costs.daily, costs.section, costs.monthly, costs.cumulative].map((c) =>
            money(c[key]),
          ),
        ]),
      },
      {
        title: `Stock value (${currency})`,
        rows: [['Final stock × current price', money(inventory.stockValue)]],
      },
    ],
  };
}

/** The data of the recap page. */
export type RecapExportInput = { recap: Recap; well: Well; project: Project };

/** Sheet `Recap`: the recap page for its scope (section or well). */
export function recapSheet({ recap: r, well, project }: RecapExportInput): Sheet {
  const system = project.unitSystem;
  const q = quantityOf(system);
  const unit = unitOf(system);
  const currency = project.currency;
  const a = r.accounting;
  return {
    name: 'Recap',
    title: [
      `Recap — ${r.scope === 'section' ? 'section' : 'well'}`,
      `${project.operator} · ${well.name} · ${project.name}`,
      `Reports ${r.reports.first ?? '—'}–${r.reports.last ?? '—'} (${r.reports.count})`,
    ],
    blocks: [
      {
        title: 'Summary',
        header: ['Item', 'Value', 'Unit'],
        rows: [
          ['Cost', shownNumber(r.cost.total, 2), currency],
          ['Local cost', shownNumber(r.cost.local, 2), currency],
          ['Average ROP', q(r.averageRop, 'rop'), unit('rop')],
        ],
      },
      {
        title: 'Chemicals consumption',
        header: [
          'Product',
          'Package',
          `Price (${currency})`,
          'Used',
          `Cost (${currency})`,
          `Concentration (${unit('concentration')})`,
          '% vol',
          'Cost %',
        ],
        rows: r.products.map((p) => [
          p.name,
          `${shownNumber(p.packageSize, 3)} ${p.packageUnit}`,
          shownNumber(p.unitPrice, 2),
          shownNumber(p.used, 3),
          shownNumber(p.cost, 2),
          q(p.concentration, 'concentration'),
          p.volumePercent === null ? null : shownNumber(p.volumePercent, 2),
          shownNumber(p.costShare, 2),
        ]),
      },
      {
        title: `Volume accounting (${unit('volume')})`,
        header: ['Item', 'Volume'],
        rows: [
          ['Start volume', q(a.start, 'volume')],
          ['Water', q(a.water, 'volume')],
          ['Chemicals', q(a.chemical, 'volume')],
          ['Diesel', q(a.diesel, 'volume')],
          ['Received', q(a.received, 'volume')],
          ['Return', q(a.returned, 'volume')],
          ['Built', q(a.built, 'volume')],
          ...VOLUME_LOSS_ITEMS.map((item): Cell[] => [
            `Loss: ${enumLabel(item)}`,
            q(a.losses[item], 'volume'),
          ]),
          ['Total losses', q(a.totalLosses, 'volume')],
          ['End volume', q(a.end, 'volume')],
        ],
      },
      {
        title: 'Operation hours',
        header: ['Activity', 'Hours'],
        rows: r.operationHours.map((o) => [o.activity, shownNumber(o.hours, 2)]),
      },
    ],
  };
}

/** `PYW-24 ST1` → `PYW-24-ST1`, for a file name. */
export const fileSafe = (name: string) =>
  name.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'well';
