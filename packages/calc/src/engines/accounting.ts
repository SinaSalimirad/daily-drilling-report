import type { VolumeLossItem } from '@ddr/schemas';
import { BBL_PER_M3, roundTo } from './geometry';

// Mud-volume accounting table (workbook `DMR!L61:Z81`, `MudPits(2)!O8:O26`; analysis §8.2).
// Everything in barrels.

/** Chemical volume for the table, bbl, from the day's chemical volume in m³ (`DMR!R65`). */
export function chemicalVolumeBbl(chemicalM3: number): number {
  // WORKBOOK-ROUNDING: one decimal as displayed.
  return roundTo(chemicalM3 * BBL_PER_M3, 1);
}

/** Built = water + chemical + diesel (`R69`). */
export function builtVolume(water: number, chemical: number, diesel: number): number {
  return roundTo(water + chemical + diesel, 2);
}

/** Sum of the ten loss items (`MudPits(2)!O25`). */
export function totalLosses(losses: Partial<Record<VolumeLossItem, number>>): number {
  return roundTo(
    Object.values(losses).reduce((sum, value) => sum + (value ?? 0), 0),
    2,
  );
}

/** End volume = ROUND(start + received + built − return − losses, 0) (`MudPits(2)!O26`). */
export function endVolume(input: {
  start: number;
  received: number;
  built: number;
  returned: number;
  losses: number;
}): number {
  // WORKBOOK-ROUNDING: whole barrels.
  return roundTo(input.start + input.received + input.built - input.returned - input.losses, 0);
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
  return roundTo(input.end - (input.hole + input.active + input.reserve), 2);
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
  // WORKBOOK-QUIRK: the period's losses are start + received − return + built − today's end.
  const losses = positive(roundTo(start + entries.received - entries.returned + built - end, 2));
  const others = Object.entries(entries.losses)
    .filter(([item]) => item !== 'shakers' && item !== 'dumped')
    .reduce((sum, [, value]) => sum + value, 0);
  const dumped = positive(entries.losses.dumped);
  // WORKBOOK-QUIRK: Shakers is whatever remains of the losses once the other items are taken.
  const shakers = positive(roundTo(losses - dumped - others, 2));
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
