import type { InventoryRow } from '@ddr/schemas';

// Typed text of the inventory table → request body. Pure, so it is tested.

export type MoveDraft = { received: string; used: string };

/** `"-4,5"` → -4.5; empty → 0; anything else that is not a number → NaN. */
export function parseQuantity(text: string): number {
  const trimmed = text.trim();
  return trimmed === '' ? 0 : Number(trimmed.replace(',', '.'));
}

export function toDraft(row: InventoryRow): MoveDraft {
  return {
    received: row.received === 0 ? '' : String(row.received),
    used: row.used === 0 ? '' : String(row.used),
  };
}

/** Rows with a quantity; products left empty have no move. */
export function movesOf(drafts: Record<string, MoveDraft>) {
  return Object.entries(drafts).flatMap(([projectProductId, draft]) => {
    const received = parseQuantity(draft.received);
    const used = parseQuantity(draft.used);
    return received === 0 && used === 0 ? [] : [{ projectProductId, received, used }];
  });
}

/** Stock the row will have once the typed quantities are saved (live preview). */
export function previewStock(row: InventoryRow, draft: MoveDraft): number {
  const received = parseQuantity(draft.received);
  const used = parseQuantity(draft.used);
  if (Number.isNaN(received) || Number.isNaN(used)) return row.finalStock;
  return Math.round((row.initial + received - used) * 1000) / 1000;
}
