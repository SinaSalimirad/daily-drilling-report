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
import { SECTION_PAGE_SIZE, SECTION_ROW_CLASS, SECTION_TABLE_MIN_HEIGHT } from "../constants";
import type { SectionListItem } from "../type";
import { sectionColumns } from "./section-columns";
import { SectionTableToolbar } from "./section-table-toolbar";

// Filtering, sorting and paging run in the browser because GET /sections returns every row.
export function SectionTable({ data }: { data: SectionListItem[] }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: SECTION_PAGE_SIZE });

  const table = useTable({
    features,
    data,
    columns: sectionColumns,
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
  });

  const rows = table.getRowModel().rows;

  return (
    <section className="border p-2 rounded-sm flex flex-col gap-4">
      <SectionTableToolbar table={table} />

      <div
        className="overflow-hidden rounded-md border w-full"
        style={{ minHeight: SECTION_TABLE_MIN_HEIGHT }}
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
                  className={SECTION_ROW_CLASS}
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
                <TableCell colSpan={sectionColumns.length} className="h-24 text-center">
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
