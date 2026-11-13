// Values must match `RigType` / `CurrencyCode` in apps/api/src/features/projects/projects.schema.ts.
export const RIG_TYPES = ["offshore", "onshore"] as const;
export const CURRENCY_CODES = ["USD", "GBP", "EUR", "CNY", "IRR"] as const;

export type RigType = (typeof RIG_TYPES)[number];
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const RIG_TYPE_ITEMS: ReadonlyArray<{ value: RigType; label: string }> = [
  { value: "offshore", label: "Offshore" },
  { value: "onshore", label: "Onshore" },
];

export const CURRENCY_ITEMS: ReadonlyArray<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "GBP", label: "Pound Sterling (GBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "CNY", label: "Yuan (CNY)" },
  { value: "IRR", label: "Iranian Rial (IRR)" },
];

// A project has 1 or 2 operators and 1 or 2 contractors, each name up to 255 characters.
export const MAX_NAMES = 2;
export const MAX_NAME_LENGTH = 255;

// Table sizing shared by ProjectTable and ProjectsSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const PROJECT_PAGE_SIZE = 10;
export const PROJECT_ROW_CLASS = "h-12"; // 48px
export const PROJECT_TABLE_MIN_HEIGHT = 40 + PROJECT_PAGE_SIZE * 48; // header h-10 + rows
