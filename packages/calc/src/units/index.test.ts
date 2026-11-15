import { describe, expect, it } from 'bun:test';
import { QUANTITIES, QUANTITY_UNITS, type UnitId } from '@ddr/schemas';
import { convert, fromSI, toSI, UNIT_SYSTEM_PRESETS, UNITS, unitLabel } from './index';

const ALL_UNITS = Object.keys(UNITS) as UnitId[];

describe('exact factors of docs/08', () => {
  // One case per row of the table "Exact conversion factors".
  const cases: [UnitId, number, number][] = [
    ['bbl', 1, 0.158987294928],
    ['gal', 1, 0.003785411784],
    ['in', 1, 0.0254],
    ['ft', 1, 0.3048],
    ['psi', 1, 6894.757293168],
    ['pcf', 1, 16.01846337396],
    ['ppg', 1, 119.8264273],
    ['lb_bbl', 1, 2.853010174],
    ['lbf_100ft2', 1, 0.4788025898],
    ['cp', 1, 0.001],
  ];
  for (const [unit, value, si] of cases) {
    it(`1 ${unitLabel(unit)} = ${si} SI`, () => {
      expect(toSI(value, unit)).toBe(si);
    });
  }

  it('°F → °C with the offset: (°F − 32) / 1.8', () => {
    expect(toSI(32, 'degf')).toBe(0);
    expect(toSI(212, 'degf')).toBe(100);
    expect(toSI(-40, 'degf')).toBe(-40);
    expect(fromSI(100, 'degf')).toBe(212);
  });
});

describe('round trip display → SI → display', () => {
  const values = [0, 1, 75, 8.625, 2283, 0.001, 123456.789, -12.5];
  for (const unit of ALL_UNITS) {
    it(`returns the typed value for ${unit}`, () => {
      for (const value of values) {
        expect(fromSI(toSI(value, unit), unit)).toBeCloseTo(value, 9);
      }
    });
  }
});

describe('convert', () => {
  it('converts within a dimension', () => {
    expect(convert(1, 'bbl', 'gal')).toBeCloseTo(42, 12);
    expect(convert(1, 'ft', 'in')).toBeCloseTo(12, 12);
    expect(convert(75, 'pcf', 'kg_m3')).toBeCloseTo(1201.38, 2); // docs/12 issue V020-10
    expect(convert(98.6, 'degf', 'degc')).toBeCloseTo(37, 12);
    expect(convert(5, 'm', 'm')).toBe(5);
  });

  it('refuses to convert between dimensions', () => {
    expect(() => convert(1, 'bbl', 'kg')).toThrow('Cannot convert bbl');
  });
});

describe('units and presets', () => {
  it('every unit of every quantity has a factor and the quantity has one dimension', () => {
    for (const quantity of QUANTITIES) {
      const dimensions = new Set(QUANTITY_UNITS[quantity].map((u) => UNITS[u].dimension));
      expect(dimensions.size).toBe(1);
    }
  });

  it('presets name an allowed unit for every quantity', () => {
    for (const preset of Object.values(UNIT_SYSTEM_PRESETS)) {
      expect(Object.keys(preset).sort()).toEqual([...QUANTITIES].sort());
      for (const quantity of QUANTITIES) {
        expect(QUANTITY_UNITS[quantity] as readonly string[]).toContain(preset[quantity]);
      }
    }
  });

  it('the workbook preset matches docs/03', () => {
    const wb = UNIT_SYSTEM_PRESETS.workbook;
    expect([
      wb.volume,
      wb.density,
      wb.pressure,
      wb.depth,
      wb.flowRate,
      wb.concentration,
      wb.temperature,
    ]).toEqual(['bbl', 'pcf', 'psi', 'm', 'gpm', 'lb_bbl', 'degf']);
  });
});
