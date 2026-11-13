"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableFeatures } from "@/lib/table-feature";
import type { ReportListItem } from "../type";
import { ReportDeleteDialog } from "./report-delete-dialog";
import { ReportEditSheet } from "./report-edit-sheet";

const columnHelper = createColumnHelper<DataTableFeatures, ReportListItem>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

const centeredCell = (value: string) => <div className="text-center tabular-nums">{value}</div>;

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function ReportActions({ report }: { report: ReportListItem }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Report actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit report</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete report
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <ReportEditSheet report={report} open={editOpen} onOpenChange={setEditOpen} />
      <ReportDeleteDialog report={report} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const reportColumns = columnHelper.columns([
  columnHelper.display({
    id: "counter",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground tabular-nums">{row.index + 1}</div>
    ),
  }),
  columnHelper.accessor("wellName", {
    header: () => <div className="text-left">Well</div>,
    cell: ({ getValue }) => <span className="font-medium text-left">{getValue()}</span>,
    filterFn: "includesString", // case-insensitive search from the toolbar
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("reportNumber", {
    header: centeredHeader("Report No."),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("date", {
    header: centeredHeader("Date"),
    cell: ({ getValue }) => centeredCell(getValue()),
    sortFn: "alphanumeric", // "YYYY-MM-DD" sorts correctly as text
  }),
  columnHelper.accessor("sectionName", {
    header: centeredHeader("Section"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("wellStatus", {
    header: centeredHeader("Well Status"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("mudType", {
    header: centeredHeader("Mud Type"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("presentActivity", {
    header: centeredHeader("Present Activity"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("totalDepth", {
    header: centeredHeader("Total Depth (m)"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <ReportActions report={row.original} />,
  }),
]);
