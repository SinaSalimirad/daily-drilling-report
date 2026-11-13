import type { ReactTable, RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataTableFeatures } from "@/lib/table-feature";

export function DataTablePagination<TData extends RowData>({
  table,
}: {
  table: ReactTable<DataTableFeatures, TData>;
}) {
  const { pageIndex, pageSize } = table.state.pagination;
  // An empty result still shows "Page 1 of 1" instead of "Page 1 of 0".
  const pageCount = Math.max(table.getPageCount(), 1);

  const rowCount = table.getRowCount();
  const firstRow = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground tabular-nums">
        {firstRow} - {lastRow} of {rowCount} row(s)
      </p>

      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums">
          Page {pageIndex + 1} of {pageCount}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous page</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );
}
