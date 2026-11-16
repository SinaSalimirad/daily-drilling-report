import { fromSI, toSI, unitLabel } from '@ddr/calc/units';
import type { Quantity, UnitId, UnitSystem } from '@ddr/schemas';

// The only place the web app formats numbers, dates and quantities (docs/02 "Units and
// formatting"). Components never hold a conversion factor: they pass SI values and a
// quantity, and this file asks @ddr/calc/units. Dates are Gregorian `YYYY-MM-DD` on the
// wire; the later Persian calendar is a change in this file only.

const LOCALE = 'en-US';

/** Decimals shown for each display unit (display only; stored values are never rounded). */
const DISPLAY_DECIMALS: Record<UnitId, number> = {
  m: 2,
  ft: 1,
  mm: 1,
  in: 3,
  in_32: 0,
  m3: 2,
  bbl: 2,
  gal: 2,
  kg_m3: 2,
  sg: 3,
  ppg: 2,
  pcf: 1,
  lb_bbl: 2,
  mg_l: 0,
  pa: 1,
  kpa: 1,
  bar: 2,
  psi: 0,
  lbf_100ft2: 0,
  m3_s: 4,
  m3_min: 3,
  l_min: 0,
  gpm: 0,
  pa_s: 4,
  mpa_s: 1,
  cp: 0,
  kg: 1,
  t: 3,
  lb: 0,
  m_s: 5,
  m_h: 1,
  ft_h: 1,
  degc: 1,
  degf: 0,
};

export function formatNumber(value: number | null | undefined, maxDecimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxDecimals }).format(value);
}

/** `2026-07-28` → `28 Jul 2026`. Parsed as a calendar date, so no time zone can shift it. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** The month an ISO date belongs to, as a sortable key: `2026-07-28` → `2026-07`. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** A month key of `monthKey` → `Jul 2026`. */
export function formatMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** ISO date-time → local date and time, e.g. `28 Jul 2026, 19:30`. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function displayUnit(system: UnitSystem, quantity: Quantity): UnitId {
  return system[quantity];
}

export function quantityLabel(system: UnitSystem, quantity: Quantity): string {
  return unitLabel(system[quantity]);
}

/** SI value → number in the project's display unit (unrounded). */
export function toDisplay(si: number, quantity: Quantity, system: UnitSystem): number {
  return fromSI(si, system[quantity]);
}

/** Number typed in the project's display unit → SI value (unrounded). */
export function fromDisplay(value: number, quantity: Quantity, system: UnitSystem): number {
  return toSI(value, system[quantity]);
}

/** Display text of a stored SI value, e.g. `75 PCF`, rounded for reading only. */
export function formatQuantity(
  si: number | null | undefined,
  quantity: Quantity,
  system: UnitSystem,
  { withUnit = true }: { withUnit?: boolean } = {},
): string {
  if (si === null || si === undefined) return '—';
  const unit = system[quantity];
  const text = formatNumber(fromSI(si, unit), DISPLAY_DECIMALS[unit]);
  return withUnit ? `${text} ${unitLabel(unit)}` : text;
}

/**
 * A number rounded exactly as `formatNumber` shows it (same rounding mode), for files such as
 * the Excel export, whose cells must equal the screen.
 */
export function shownNumber(value: number, maxDecimals = 2): number {
  return Number(
    new Intl.NumberFormat(LOCALE, {
      maximumFractionDigits: maxDecimals,
      useGrouping: false,
    }).format(value),
  );
}

/** A stored SI value as the number shown on screen: display unit, display decimals. */
export function shownQuantity(
  si: number | null | undefined,
  quantity: Quantity,
  system: UnitSystem,
): number | null {
  if (si === null || si === undefined) return null;
  const unit = system[quantity];
  return shownNumber(fromSI(si, unit), DISPLAY_DECIMALS[unit]);
}

/**
 * Editable text of a stored SI value in the display unit. Float noise from the round
 * trip is removed (12 significant digits), so 75 PCF reads back as `75`.
 */
export function editableText(
  si: number | null | undefined,
  quantity: Quantity,
  system: UnitSystem,
): string {
  if (si === null || si === undefined) return '';
  return String(Number(fromSI(si, system[quantity]).toPrecision(12)));
}
