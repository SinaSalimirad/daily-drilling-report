// Values must match `ProductUnit` / `ProductOrigin` in apps/api/src/features/products/products.schema.ts.
export const PRODUCT_UNITS = [
  "BB",
  "bbl",
  "DR",
  "gal",
  "kg",
  "l",
  "lb",
  "m³",
  "m x m",
  "ton",
] as const;

export const PRODUCT_ORIGINS = ["local", "foreign"] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];
export type ProductOrigin = (typeof PRODUCT_ORIGINS)[number];

export const UNIT_ITEMS: ReadonlyArray<{ value: ProductUnit; label: string }> = [
  { value: "BB", label: "Big Bag (BB)" },
  { value: "bbl", label: "Barrel (bbl)" },
  { value: "DR", label: "Drum (DR)" },
  { value: "gal", label: "Gallon (gal)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "l", label: "Liter (l)" },
  { value: "lb", label: "Pound (lb)" },
  { value: "m³", label: "Cubic meter (m³)" },
  { value: "m x m", label: "Square meter (m x m)" },
  { value: "ton", label: "Tonne (ton)" },
];

export const ORIGIN_ITEMS: ReadonlyArray<{ value: ProductOrigin; label: string }> = [
  { value: "local", label: "Local" },
  { value: "foreign", label: "Foreign" },
];

// Table sizing shared by ProductTable and ProductsSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const PRODUCT_PAGE_SIZE = 10;
export const PRODUCT_ROW_CLASS = "h-12"; // 48px
export const PRODUCT_TABLE_MIN_HEIGHT = 40 + PRODUCT_PAGE_SIZE * 48; // header h-10 + rows
