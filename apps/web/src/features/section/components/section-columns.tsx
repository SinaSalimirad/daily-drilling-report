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
import type { SectionListItem } from "../type";
import { SectionDeleteDialog } from "./section-delete-dialog";
import { SectionEditSheet } from "./section-edit-sheet";

const columnHelper = createColumnHelper<DataTableFeatures, SectionListItem>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

const centeredCell = (value: string) => <div className="text-center tabular-nums">{value}</div>;

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function SectionActions({ section }: { section: SectionListItem }) {
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
            <DropdownMenuLabel>Section actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit section</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete section
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <SectionEditSheet section={section} open={editOpen} onOpenChange={setEditOpen} />
      <SectionDeleteDialog section={section} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const sectionColumns = columnHelper.columns([
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
  columnHelper.accessor("wellName", {
    header: centeredHeader("Well"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("sequence", {
    header: centeredHeader("Sequence"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <SectionActions section={row.original} />,
  }),
]);
