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
import type { InventoryListItem } from "../type";
import { InventoryDeleteDialog } from "./inventory-delete-dialog";
import { InventoryEditSheet } from "./inventory-edit-sheet";
import { productLabel } from "./inventory-items";

const columnHelper = createColumnHelper<DataTableFeatures, InventoryListItem>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

const centeredCell = (value: string) => <div className="text-center tabular-nums">{value}</div>;

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function InventoryActions({ inventory }: { inventory: InventoryListItem }) {
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
            <DropdownMenuLabel>Inventory actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit inventory</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete inventory
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <InventoryEditSheet inventory={inventory} open={editOpen} onOpenChange={setEditOpen} />
      <InventoryDeleteDialog inventory={inventory} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const inventoryColumns = columnHelper.columns([
  columnHelper.display({
    id: "counter",
    header: () => <div className="text-center">#</div>,
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground tabular-nums">{row.index + 1}</div>
    ),
  }),
  columnHelper.accessor("productName", {
    header: () => <div className="text-left">Product</div>,
    cell: ({ row }) => (
      <span className="font-medium text-left">
        {productLabel({
          name: row.original.productName,
          size: row.original.productSize,
          unit: row.original.productUnit,
        })}
      </span>
    ),
    filterFn: "includesString", // case-insensitive search from the toolbar
    sortFn: "alphanumeric",
  }),
  columnHelper.accessor("wellName", {
    header: centeredHeader("Well"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("reportNumber", {
    header: centeredHeader("Report No."),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("reportDate", {
    header: centeredHeader("Report Date"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("init", {
    header: centeredHeader("Initial"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("received", {
    header: centeredHeader("Received"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("used", {
    header: centeredHeader("Used"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("returned", {
    header: centeredHeader("Returned"),
    cell: ({ getValue }) => centeredCell(String(getValue())),
  }),
  columnHelper.accessor("final", {
    header: centeredHeader("Final"),
    cell: ({ getValue }) => (
      <div className="text-center font-medium tabular-nums">{getValue()}</div>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <InventoryActions inventory={row.original} />,
  }),
]);
