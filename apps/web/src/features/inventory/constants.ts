// Table sizing shared by InventoryTable and InventoriesSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const INVENTORY_PAGE_SIZE = 10;
export const INVENTORY_ROW_CLASS = "h-12"; // 48px
export const INVENTORY_TABLE_MIN_HEIGHT = 40 + INVENTORY_PAGE_SIZE * 48; // header h-10 + rows
