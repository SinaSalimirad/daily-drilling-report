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
import { WELL_PAGE_SIZE, WELL_ROW_CLASS, WELL_TABLE_MIN_HEIGHT } from "../constants";
import type { WellListItem } from "../type";
import { wellColumns } from "./well-columns";
import { WellTableToolbar } from "./well-table-toolbar";

// Filtering, sorting and paging run in the browser because GET /wells returns every row.
export function WellTable({ data }: { data: WellListItem[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: WELL_PAGE_SIZE });

  const table = useTable({
    features,
    data,
    columns: wellColumns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  const rows = table.getRowModel().rows;

  return (
    <section className="border p-2 rounded-sm flex flex-col gap-4">
      <WellTableToolbar table={table} />

      <div
        className="overflow-hidden rounded-md border w-full"
        style={{ minHeight: WELL_TABLE_MIN_HEIGHT }}
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
                  className={WELL_ROW_CLASS}
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
                <TableCell colSpan={wellColumns.length} className="h-24 text-center">
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
