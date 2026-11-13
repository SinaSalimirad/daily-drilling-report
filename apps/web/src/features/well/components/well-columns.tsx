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
import { DESIGNATION_ITEMS, labelOf, RIG_TYPE_ITEMS, WELL_TYPE_ITEMS } from "../constants";
import type { WellListItem } from "../type";
import { WellDeleteDialog } from "./well-delete-dialog";
import { WellEditSheet } from "./well-edit-sheet";

const columnHelper = createColumnHelper<DataTableFeatures, WellListItem>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

const centeredCell = (value: string) => <div className="text-center tabular-nums">{value}</div>;

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function WellActions({ well }: { well: WellListItem }) {
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
            <DropdownMenuLabel>Well actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit well</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete well
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <WellEditSheet well={well} open={editOpen} onOpenChange={setEditOpen} />
      <WellDeleteDialog well={well} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const wellColumns = columnHelper.columns([
  columnHelper.display({
    id: "counter",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground tabular-nums">{row.index + 1}</div>
    ),
  }),
  columnHelper.accessor("name", {
    header: () => <div className="text-left">Name</div>,
    cell: ({ getValue }) => <span className="font-medium text-left">{getValue()}</span>,
    filterFn: "includesString", // case-insensitive search from the toolbar
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("projectName", {
    header: centeredHeader("Project"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("designation", {
    header: centeredHeader("Designation"),
    cell: ({ getValue }) => centeredCell(labelOf(DESIGNATION_ITEMS, getValue())),
  }),
  columnHelper.accessor("wellType", {
    header: centeredHeader("Well Type"),
    cell: ({ getValue }) => centeredCell(labelOf(WELL_TYPE_ITEMS, getValue())),
  }),
  columnHelper.accessor("rigName", {
    header: centeredHeader("Rig"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("rigType", {
    header: centeredHeader("Rig Type"),
    cell: ({ getValue }) => centeredCell(labelOf(RIG_TYPE_ITEMS, getValue())),
  }),
  columnHelper.accessor("spudDate", {
    header: centeredHeader("Spud Date"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  // Only offshore wells have a water depth, in meters.
  columnHelper.accessor("waterDepthM", {
    header: centeredHeader("Water Depth (m)"),
    cell: ({ getValue }) => centeredCell(getValue() == null ? "—" : String(getValue())),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <WellActions well={row.original} />,
  }),
]);
