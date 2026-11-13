// Table sizing shared by ReportTable and ReportsSkeleton so the loading state and the
// loaded state occupy the same height, even when the last page has fewer rows.
export const REPORT_PAGE_SIZE = 10;
export const REPORT_ROW_CLASS = "h-12"; // 48px
export const REPORT_TABLE_MIN_HEIGHT = 40 + REPORT_PAGE_SIZE * 48; // header h-10 + rows
