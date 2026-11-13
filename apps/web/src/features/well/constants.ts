// Values must match the enums in apps/api/src/features/wells/wells.schema.ts
// (`Designation`, `WellType`) and `RigType` in apps/api/src/features/projects/projects.schema.ts.
export const DESIGNATIONS = [
  "exploration",
  "cuttings",
  "re-injection",
  "work-over",
  "repairing",
  "re-entry",
  "new leg",
  "perforation",
  "plugging",
] as const;
export const WELL_TYPES = ["Directional", "Vertical"] as const;
export const RIG_TYPES = ["offshore", "onshore"] as const;

export type Designation = (typeof DESIGNATIONS)[number];
export type WellType = (typeof WELL_TYPES)[number];
export type RigType = (typeof RIG_TYPES)[number];

export const DESIGNATION_ITEMS: ReadonlyArray<{ value: Designation; label: string }> = [
  { value: "exploration", label: "Exploration" },
  { value: "cuttings", label: "Cuttings" },
  { value: "re-injection", label: "Re-injection" },
  { value: "work-over", label: "Work-over" },
  { value: "repairing", label: "Repairing" },
  { value: "re-entry", label: "Re-entry" },
  { value: "new leg", label: "New leg" },
  { value: "perforation", label: "Perforation" },
  { value: "plugging", label: "Plugging" },
];

export const WELL_TYPE_ITEMS: ReadonlyArray<{ value: WellType; label: string }> = [
  { value: "Directional", label: "Directional" },
  { value: "Vertical", label: "Vertical" },
];

export const RIG_TYPE_ITEMS: ReadonlyArray<{ value: RigType; label: string }> = [
  { value: "offshore", label: "Offshore" },
  { value: "onshore", label: "Onshore" },
];

/** Label for an enum value, e.g. "re-injection" -> "Re-injection". Falls back to the raw value. */
export function labelOf(items: ReadonlyArray<{ value: string; label: string }>, value: string) {
  return items.find((item) => item.value === value)?.label ?? value;
}

// Table sizing shared by WellTable and WellsSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const WELL_PAGE_SIZE = 10;
export const WELL_ROW_CLASS = "h-12"; // 48px
export const WELL_TABLE_MIN_HEIGHT = 40 + WELL_PAGE_SIZE * 48; // header h-10 + rows
