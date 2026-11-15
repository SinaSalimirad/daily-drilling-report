import { describe, expect, it } from 'bun:test';
import { chemicalVolume, costOf, finalStock, stockMass } from './inventory';

// finalStock: golden case of the workbook, report 1 (docs/08, `Chem Inv.!O11`).
// The other functions: no per-product usage of report 1 is documented (only the day's
// total, 3.714 m³), so their cases apply the formulas of analysis §7.2 by hand.

describe('finalStock', () => {
  it('initial 0, received 164, used 0 → 164 (Chem Inv.!O11)', () => {
    expect(finalStock({ initial: 0, received: 164, used: 0 })).toBe(164);
  });

  it('subtracts the usage and treats a negative received as a return', () => {
    expect(finalStock({ initial: 164, received: 0, used: 10 })).toBe(154);
    expect(finalStock({ initial: 154, received: -4, used: 0 })).toBe(150);
  });

  it('can go negative (the API turns that into a warning)', () => {
    expect(finalStock({ initial: 1, received: 0, used: 3 })).toBe(-2);
  });
});

describe('chemicalVolume', () => {
  const sg = 2.6;
  it('kg: size / SG × used / 1000', () => {
    expect(chemicalVolume({ unit: 'kg', size: 25, specificGravity: sg }, 40)).toBeCloseTo(
      0.384615,
      6,
    );
  });
  it('lb: size / SG × used / 2204', () => {
    expect(chemicalVolume({ unit: 'lb', size: 50, specificGravity: sg }, 10)).toBeCloseTo(
      0.087254,
      6,
    );
  });
  it('t: size / SG × used', () => {
    expect(chemicalVolume({ unit: 't', size: 1, specificGravity: 2 }, 3)).toBe(1.5);
  });
  it('gal: size × used × 3.785 / 1000', () => {
    expect(chemicalVolume({ unit: 'gal', size: 55, specificGravity: null }, 2)).toBeCloseTo(
      0.41635,
      9,
    );
  });
  it('l: size × used / 1000', () => {
    expect(chemicalVolume({ unit: 'l', size: 20, specificGravity: null }, 5)).toBe(0.1);
  });
  it('m3: size × used', () => {
    expect(chemicalVolume({ unit: 'm3', size: 1, specificGravity: null }, 4)).toBe(4);
  });
  it('bbl: size × used / 6.29', () => {
    expect(chemicalVolume({ unit: 'bbl', size: 1, specificGravity: null }, 6.29)).toBeCloseTo(
      1,
      12,
    );
  });
  it('is unknown (null) for a mass unit without a specific gravity', () => {
    expect(chemicalVolume({ unit: 'kg', size: 25, specificGravity: null }, 40)).toBeNull();
  });
});

describe('costOf', () => {
  it('used × price', () => {
    expect(costOf(12, 8.5)).toBe(102);
    expect(costOf(0, 8.5)).toBe(0);
  });
});

describe('stockMass', () => {
  it('kg and t are exact; lb uses the workbook constant', () => {
    expect(stockMass({ unit: 'kg', size: 25, specificGravity: null }, 4)).toBe(100);
    expect(stockMass({ unit: 't', size: 1, specificGravity: null }, 2)).toBe(2000);
    expect(stockMass({ unit: 'lb', size: 2204, specificGravity: null }, 1)).toBeCloseTo(1000, 9);
  });
  it('volume units go through the specific gravity', () => {
    expect(stockMass({ unit: 'l', size: 200, specificGravity: 1.2 }, 2)).toBeCloseTo(480, 9);
    expect(stockMass({ unit: 'l', size: 200, specificGravity: null }, 2)).toBeNull();
  });
});
