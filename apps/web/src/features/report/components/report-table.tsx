"use client";

import { type ColumnFiltersState, type SortingState, useTable } from "@tanstack/react-table";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { features } from "@/lib/table-feature";
import { DataTablePagination } from "@/shared/components/data-table-pagination";
import { REPORT_PAGE_SIZE, REPORT_ROW_CLASS, REPORT_TABLE_MIN_HEIGHT } from "../constants";
import type { ReportListItem } from "../type";
import { reportColumns } from "./report-columns";
import { ReportTableToolbar } from "./report-table-toolbar";

// Filtering, sorting and paging run in the browser because GET /reports returns every row.
export function ReportTable({ data }: { data: ReportListItem[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: REPORT_PAGE_SIZE });

  const table = useTable({
    features,
    data,
    columns: reportColumns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  const rows = table.getRowModel().rows;

  return (
    <section className="border p-2 rounded-sm flex flex-col gap-4">
      <ReportTableToolbar table={table} />

      <div
        className="overflow-hidden rounded-md border w-full"
        style={{ minHeight: REPORT_TABLE_MIN_HEIGHT }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="bg-muted text-foreground">
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={REPORT_ROW_CLASS}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={reportColumns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </section>
  );
}
