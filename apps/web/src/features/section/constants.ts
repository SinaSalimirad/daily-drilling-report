// Table sizing shared by SectionTable and SectionsSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const SECTION_PAGE_SIZE = 10;
export const SECTION_ROW_CLASS = "h-12"; // 48px
export const SECTION_TABLE_MIN_HEIGHT = 40 + SECTION_PAGE_SIZE * 48; // header h-10 + rows
