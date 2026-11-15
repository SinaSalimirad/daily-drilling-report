import { describe, expect, it } from 'bun:test';
import type { InventoryRow } from '@ddr/schemas';
import { movesOf, parseQuantity, previewStock } from './inventory-moves';

const row = { initial: 164, received: 0, used: 0, finalStock: 164 } as InventoryRow;

describe('parseQuantity', () => {
  it('reads decimals with a comma, negatives, and empty as 0', () => {
    expect(parseQuantity('4,5')).toBe(4.5);
    expect(parseQuantity('-4')).toBe(-4);
    expect(parseQuantity('  ')).toBe(0);
    expect(parseQuantity('abc')).toBeNaN();
  });
});

describe('movesOf', () => {
  it('keeps rows with a quantity and drops empty ones', () => {
    expect(
      movesOf({
        a: { received: '10', used: '' },
        b: { received: '', used: '' },
        c: { received: '0', used: '2' },
      }),
    ).toEqual([
      { projectProductId: 'a', received: 10, used: 0 },
      { projectProductId: 'c', received: 0, used: 2 },
    ]);
  });
});

describe('previewStock', () => {
  it('initial + received − used (workbook: 0 + 164 − 0 = 164)', () => {
    expect(previewStock({ ...row, initial: 0 }, { received: '164', used: '' })).toBe(164);
    expect(previewStock(row, { received: '', used: '10.5' })).toBe(153.5);
  });
  it('keeps the saved stock while the text is not a number', () => {
    expect(previewStock(row, { received: 'x', used: '' })).toBe(164);
  });
});
