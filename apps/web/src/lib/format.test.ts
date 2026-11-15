import { describe, expect, it } from 'bun:test';
import { UNIT_SYSTEM_PRESETS } from '@ddr/calc/units';
import {
  editableText,
  formatDate,
  formatNumber,
  formatQuantity,
  fromDisplay,
  quantityLabel,
  toDisplay,
} from './format';

const workbook = UNIT_SYSTEM_PRESETS.workbook;
const si = UNIT_SYSTEM_PRESETS.si;

describe('quantities (issue V020-10)', () => {
  it('typing 75 with PCF stores 1201.38 kg/m³ and shows 75 again after a reload', () => {
    const stored = fromDisplay(75, 'density', workbook);
    expect(formatQuantity(stored, 'density', si)).toBe('1,201.38 kg/m³');
    // A reload gets the stored SI number back from the API:
    expect(editableText(stored, 'density', workbook)).toBe('75');
    expect(formatQuantity(stored, 'density', workbook)).toBe('75 PCF');
  });

  it('switching the unit system changes labels and values, not the stored number', () => {
    const stored = fromDisplay(541.32, 'volume', workbook);
    expect(quantityLabel(workbook, 'volume')).toBe('bbl');
    expect(quantityLabel(si, 'volume')).toBe('m³');
    expect(formatQuantity(stored, 'volume', workbook)).toBe('541.32 bbl');
    expect(formatQuantity(stored, 'volume', si)).toBe('86.06 m³');
  });

  it('round-trips every quantity of both presets through the editable text', () => {
    for (const system of [si, workbook]) {
      for (const quantity of Object.keys(system) as (keyof typeof system)[]) {
        const stored = fromDisplay(12.5, quantity, system);
        expect(editableText(stored, quantity, system)).toBe('12.5');
        expect(toDisplay(stored, quantity, system)).toBeCloseTo(12.5, 9);
      }
    }
  });

  it('shows a dash for a missing value and can drop the unit', () => {
    expect(formatQuantity(null, 'depth', si)).toBe('—');
    expect(editableText(null, 'depth', si)).toBe('');
    expect(formatQuantity(2283, 'depth', si, { withUnit: false })).toBe('2,283');
  });
});

describe('numbers and dates', () => {
  it('formats numbers with at most the given decimals', () => {
    expect(formatNumber(4.1861, 2)).toBe('4.19');
    expect(formatNumber(undefined)).toBe('—');
  });

  it('formats a report date without shifting it across time zones', () => {
    expect(formatDate('2026-07-28')).toBe('28 Jul 2026');
    expect(formatDate(null)).toBe('—');
  });
});
