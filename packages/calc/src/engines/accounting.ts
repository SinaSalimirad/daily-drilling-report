import type { VolumeLossItem } from '@ddr/schemas';
import { BBL_PER_M3 } from './geometry';

// Mud-volume accounting table (workbook `DMR!L61:Z81`, `MudPits(2)!O8:O26`; analysis §8.2).
// Everything in barrels.

/** Chemical volume for the table, bbl, from the day's chemical volume in m³ (`DMR!R65`). */
export function chemicalVolumeBbl(chemicalM3: number): number {
  return chemicalM3 * BBL_PER_M3;
}

/** Built = water + chemical + diesel (`R69`). */
export function builtVolume(water: number, chemical: number, diesel: number): number {
  return water + chemical + diesel;
}

/** Sum of the ten loss items (`MudPits(2)!O25`). */
export function totalLosses(losses: Partial<Record<VolumeLossItem, number>>): number {
  return Object.values(losses).reduce((sum, value) => sum + (value ?? 0), 0);
}

/** End volume = start + received + built − return − losses (`MudPits(2)!O26`, which rounded to whole barrels). */
export function endVolume(input: {
  start: number;
  received: number;
  built: number;
  returned: number;
  losses: number;
}): number {
  return input.start + input.received + input.built - input.returned - input.losses;
}

/**
 * Difference between the books and the hole: end volume − (hole + active + reserve)
 * (`DMR!G86`). Zero means balanced.
 */
export function balanceCheck(input: {
  end: number;
  hole: number;
  active: number;
  reserve: number;
}): number {
  return input.end - (input.hole + input.active + input.reserve);
}

export type AccountingEntries = {
  water: number;
  diesel: number;
  received: number;
  returned: number;
  /** The ten loss items, summed over the period. */
  losses: Record<VolumeLossItem, number>;
};

export type AccountingColumn = AccountingEntries & {
  start: number;
  chemical: number;
  built: number;
  totalLosses: number;
  end: number;
};

const positive = (value: number) => (value > 0 ? value : 0);

/**
 * Section or well column: the items are the totals of the period up to today; start is the
 * start volume of the period; `end` is the end volume of today. Two rules differ from the
 * daily column, as in the workbook: Total Losses is recomputed from the books, and
 * Shakers is the balancing item (`U71`, `U80`).
 */
export function periodColumn(input: {
  start: number;
  entries: AccountingEntries;
  chemical: number;
  end: number;
}): AccountingColumn {
  const { start, entries, chemical, end } = input;
  const built = builtVolume(entries.water, chemical, entries.diesel);
  // Decision v0.8.5 (kept): the losses of a period are what the books leave unexplained:
  // start + received − return + built − today's end (workbook `U80`).
  const losses = positive(start + entries.received - entries.returned + built - end);
  const others = Object.entries(entries.losses)
    .filter(([item]) => item !== 'shakers' && item !== 'dumped')
    .reduce((sum, [, value]) => sum + value, 0);
  const dumped = positive(entries.losses.dumped);
  // Decision v0.8.5 (kept): Shakers is the balancing item, the loss nobody else booked
  // (workbook `U71`).
  const shakers = positive(losses - dumped - others);
  return {
    start,
    ...entries,
    losses: { ...entries.losses, dumped, shakers },
    chemical,
    built,
    totalLosses: losses,
    end,
  };
}
