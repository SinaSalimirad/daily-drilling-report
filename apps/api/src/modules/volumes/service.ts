import {
  type AccountingColumn,
  balanceCheck,
  bottomsUp,
  builtVolume,
  chemicalVolumeBbl,
  circulationTime,
  drilledVolume,
  drillPipeLength,
  endVolume,
  flowRate,
  holeStringAnnulus,
  holeVolumeAtDepth,
  periodColumn,
  roundTo,
  type StringComponent,
  stringVolumes,
  toOilfield,
  totalCirculatingVolume,
  totalLosses,
} from '@ddr/calc';
import { fromSI, toSI } from '@ddr/calc/units';
import {
  type AccountingColumnResult,
  type PumpReadings,
  type PumpReadingsPut,
  VOLUME_ITEMS,
  VOLUME_LOSS_ITEMS,
  type VolumeEntriesPut,
  type VolumeItem,
  type VolumesResult,
} from '@ddr/schemas';
import { ValidationError } from '../../lib/errors';
import type { Warning } from '../../lib/response';
import type { bhaRunsService } from '../bha-runs/service';
import type { holeSectionsService } from '../hole-sections/service';
import type { inventoryService } from '../inventory/service';
import type { pitReadingsService } from '../pit-readings/service';
import type { pumpsService } from '../pumps/service';
import type { reportsService } from '../reports/service';
import type { wellsService } from '../wells/service';
import type { volumesRepository } from './repository';

// Barrels inside (workbook units), m³ at the edge. `clean` removes the binary noise of the
// m³ ↔ bbl round trip so a typed 4.47 bbl stays 4.47.
/** Half a barrel: the books balance when the difference rounds to zero whole barrels. */
const BALANCE_TOLERANCE_BBL = 0.5;
/** Cleans the binary noise of the m³ ↔ bbl round trip; not a workbook rounding. */
const toBbl = (m3: number) => roundTo(fromSI(m3, 'bbl'), 6);
const toM3 = (bbl: number) => toSI(bbl, 'bbl');

type Items = Record<VolumeItem, number>;
const emptyItems = (): Items => Object.fromEntries(VOLUME_ITEMS.map((item) => [item, 0])) as Items;

const lossesOf = (items: Items) =>
  Object.fromEntries(
    VOLUME_LOSS_ITEMS.map((item) => [item, items[item]]),
  ) as AccountingColumn['losses'];

const columnToSI = (column: AccountingColumn): AccountingColumnResult => ({
  start: toM3(column.start),
  water: toM3(column.water),
  chemical: toM3(column.chemical),
  diesel: toM3(column.diesel),
  received: toM3(column.received),
  returned: toM3(column.returned),
  built: toM3(column.built),
  losses: Object.fromEntries(
    VOLUME_LOSS_ITEMS.map((item) => [item, toM3(column.losses[item])]),
  ) as AccountingColumnResult['losses'],
  totalLosses: toM3(column.totalLosses),
  end: toM3(column.end),
});

export const volumesService = (
  repository: ReturnType<typeof volumesRepository>,
  reports: ReturnType<typeof reportsService>,
  wells: ReturnType<typeof wellsService>,
  holeSections: ReturnType<typeof holeSectionsService>,
  bhaRuns: ReturnType<typeof bhaRunsService>,
  pumps: ReturnType<typeof pumpsService>,
  pitReadings: ReturnType<typeof pitReadingsService>,
  inventory: ReturnType<typeof inventoryService>,
) => {
  /** The whole result, in barrels (`bbl`) and as the SI response (`result`). */
  const compute = async (reportId: string) => {
    const report = await reports.get(reportId);
    const well = await wells.get(report.wellId);
    const sections = await holeSections.list(report.wellId);
    const run = report.bhaRunId ? await bhaRuns.get(report.bhaRunId) : null;
    const projectPumps = await pumps.listByProject(well.projectId, false);
    const readings = await repository.pumpReadings(reportId);
    const pits = await pitReadings.get(reportId);

    // --- mud-volume block ----------------------------------------------------------
    const td = report.td ?? 0;
    const bit = report.bitDepth ?? 0;
    const oilfield = toOilfield(sections);
    const totalHole = td > 0 ? holeVolumeAtDepth(oilfield, td, 'td') : 0;
    const atBit = bit > 0 ? holeVolumeAtDepth(oilfield, bit, 'bit') : 0;

    let string: StringComponent[] = [];
    if (run && bit > 0) {
      const others = run.components.slice(1).map((c) => c.length ?? 0);
      string = run.components.map((c, index) => ({
        lengthM: index === 0 ? drillPipeLength(bit, others) : (c.length ?? 0),
        odIn: roundTo(fromSI(c.outerDiameter, 'in'), 6),
        idIn: roundTo(fromSI(c.innerDiameter, 'in'), 6),
      }));
    }
    const volumes = stringVolumes(string);
    const block = holeStringAnnulus({
      totalHole,
      atBit,
      steel: volumes.steel,
      internal: volumes.internal,
      closedDisplacement: volumes.closedDisplacement,
      fluidNotMud: toBbl(report.fluidNotMud ?? 0),
    });
    const active = toBbl(pits.totals.active);
    const reserve = toBbl(pits.totals.reserve);
    const tcv = totalCirculatingVolume(active, block.hole, block.belowBit);

    const pumpStrokes = readings.map((reading) => {
      const pump = projectPumps.find((p) => p.id === reading.pumpId);
      return { galPerStroke: fromSI(pump?.outputPerStroke ?? 0, 'gal'), spm: reading.spm };
    });
    const flow = flowRate(pumpStrokes);
    const up = bottomsUp(block.annulus, pumpStrokes, bit);
    const circulation = circulationTime(tcv, pumpStrokes);
    const lastSection = sections[sections.length - 1];
    const holeSizeM = lastSection
      ? lastSection.type === 'open_hole'
        ? lastSection.innerDiameter
        : (lastSection.outerDiameter ?? lastSection.innerDiameter)
      : 0;
    const dailyDrilled = Math.max(0, report.dailyDrilled ?? 0);
    const drilled = drilledVolume(roundTo(fromSI(holeSizeM, 'in'), 6), dailyDrilled);

    // --- accounting: every report of the well up to this one, in order ---------------
    const history = await repository.reportsUpTo(report.wellId, report.reportNo);
    const ids = history.map((h) => h.id);
    const entryRows = await repository.entriesOf(ids);
    const chemicals = await inventory.chemicalVolumeByReport(report.wellId, report.reportNo);
    const days = history.map((h) => {
      const items = emptyItems();
      for (const row of entryRows) if (row.reportId === h.id) items[row.item] = toBbl(row.volume);
      return { ...h, items, chemical: chemicalVolumeBbl(chemicals.get(h.id) ?? 0) };
    });
    let previousEnd = 0;
    const computed = days.map((day) => {
      const built = builtVolume(day.items.water, day.chemical, day.items.diesel);
      const losses = totalLosses(lossesOf(day.items));
      const end = endVolume({
        start: previousEnd,
        received: day.items.received,
        built,
        returned: day.items.return,
        losses,
      });
      const row = { ...day, start: previousEnd, built, losses, end };
      previousEnd = end;
      return row;
    });
    const today = computed[computed.length - 1];
    if (!today) throw new Error('the report is missing from its own history');

    const sum = (rows: typeof computed) => {
      const items = emptyItems();
      for (const row of rows) for (const item of VOLUME_ITEMS) items[item] += row.items[item];
      return { items, chemical: rows.reduce((total, row) => total + row.chemical, 0) };
    };
    const column = (rows: typeof computed, start: number) => {
      const { items, chemical } = sum(rows);
      return periodColumn({
        start,
        chemical,
        end: today.end,
        entries: {
          water: items.water,
          diesel: items.diesel,
          received: items.received,
          returned: items.return,
          losses: lossesOf(items),
        },
      });
    };
    const dailyColumn: AccountingColumn = {
      start: today.start,
      water: today.items.water,
      chemical: today.chemical,
      diesel: today.items.diesel,
      received: today.items.received,
      returned: today.items.return,
      losses: lossesOf(today.items),
      built: today.built,
      totalLosses: today.losses,
      end: today.end,
    };
    const inSection = computed.filter((row) => row.sectionId === report.sectionId);
    const firstOfSection = inSection[0];
    const sectionStart = firstOfSection ? firstOfSection.start : 0;

    const balance = balanceCheck({ end: today.end, hole: block.hole, active, reserve });

    const bbl = {
      block: { ...block, active, reserve, tcv, flow, up, circulation, dailyDrilled, drilled },
      daily: dailyColumn,
      section: column(inSection, sectionStart),
      well: column(computed, 0),
      balance,
    };
    const result: VolumesResult = {
      block: {
        hole: toM3(block.hole),
        string: toM3(block.string),
        annulus: toM3(block.annulus),
        belowBit: toM3(block.belowBit),
        active: toM3(active),
        reserve: toM3(reserve),
        totalCirculating: toM3(tcv),
        flowRate: pumpStrokes.length > 0 ? toSI(flow, 'gpm') : null,
        bottomsUpMinutes: up?.minutes ?? null,
        bottomsUpStrokes: up?.strokes ?? null,
        circulationMinutes: circulation,
        dailyDrilled,
        drilledVolume: toM3(drilled),
      },
      accounting: {
        daily: columnToSI(dailyColumn),
        section: columnToSI(bbl.section),
        well: columnToSI(bbl.well),
      },
      balance: toM3(balance),
      entries: Object.fromEntries(
        VOLUME_ITEMS.map((item) => [
          item,
          entryRows.find((r) => r.reportId === reportId && r.item === item)?.volume ?? 0,
        ]),
      ) as VolumesResult['entries'],
    };
    return { bbl, result };
  };

  return {
    async get(reportId: string): Promise<VolumesResult> {
      return (await compute(reportId)).result;
    },

    /** `VOLUME_NOT_BALANCED`: the workbook's "Fluid volume is not balanced" (docs/05). */
    async warnings(reportId: string): Promise<Warning[]> {
      const { bbl, result } = await compute(reportId);
      // Balanced when the books agree with the hole to the whole barrel (no pit, hole or end
      // volume is known better than that; the workbook compared whole-barrel values).
      if (Math.abs(bbl.balance) < BALANCE_TOLERANCE_BBL) return [];
      return [
        {
          code: 'VOLUME_NOT_BALANCED',
          message: `The volume books are off by ${Math.round(bbl.balance)} bbl (end volume − hole − active − reserve)`,
          details: { difference: result.balance },
        },
      ];
    },

    async replaceEntries(reportId: string, input: VolumeEntriesPut): Promise<VolumesResult> {
      await reports.get(reportId);
      const rows = VOLUME_ITEMS.flatMap((item) => {
        const volume = input.entries[item];
        return volume ? [{ item, volume }] : [];
      });
      await repository.replaceEntries(reportId, rows);
      return (await compute(reportId)).result;
    },

    async getPumpReadings(reportId: string): Promise<PumpReadings> {
      await reports.get(reportId);
      return { readings: await repository.pumpReadings(reportId) };
    },

    async replacePumpReadings(reportId: string, input: PumpReadingsPut): Promise<PumpReadings> {
      const report = await reports.get(reportId);
      const well = await wells.get(report.wellId);
      const known = new Set((await pumps.listByProject(well.projectId, false)).map((p) => p.id));
      const seen = new Set<string>();
      const issues = input.readings.flatMap((reading, index) => {
        const problem = !known.has(reading.pumpId)
          ? 'Unknown pump of this project'
          : seen.has(reading.pumpId)
            ? 'Pump sent twice'
            : null;
        seen.add(reading.pumpId);
        return problem ? [{ path: `body.readings.${index}.pumpId`, message: problem }] : [];
      });
      if (issues.length > 0) throw new ValidationError(issues);
      await repository.replacePumpReadings(reportId, input.readings);
      return { readings: await repository.pumpReadings(reportId) };
    },
  };
};
