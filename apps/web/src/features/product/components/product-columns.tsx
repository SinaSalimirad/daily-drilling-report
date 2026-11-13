"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
import { EmptyValue } from "@/shared/components/empty-value";
import type { Product } from "../type";
import { ProductDeleteDialog } from "./product-delete-dialog";
import { ProductEditSheet } from "./product-edit-sheet";

const columnHelper = createColumnHelper<DataTableFeatures, Product>();

const centeredHeader = (title: string) => () => (
  <div className="text-center tabular-nums">{title}</div>
);

// Optional values arrive as null from the API; show a dash instead of an empty cell.
const centeredCell = (value: string | number | null) => (
  <div className="text-center tabular-nums">{value ?? <EmptyValue />}</div>
);

// A component (not inline in the column) so it can hold the edit sheet and delete dialog state.
function ProductActions({ product }: { product: Product }) {
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
            <DropdownMenuLabel>Product actions</DropdownMenuLabel>

            <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit product</DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete product
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Outside the menu: the menu content unmounts when it closes. */}
      <ProductEditSheet product={product} open={editOpen} onOpenChange={setEditOpen} />
      <ProductDeleteDialog product={product} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}

export const productColumns = columnHelper.columns([
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
  columnHelper.accessor("size", {
    header: centeredHeader("Size"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("unit", {
    header: centeredHeader("Unit"),
    cell: ({ getValue }) => (
      <div className="text-center">
        <Badge variant="outline">{getValue()}</Badge>
      </div>
    ),
  }),
  columnHelper.accessor("specificGravity", {
    header: centeredHeader("Specific Gravity"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("height", {
    header: centeredHeader("Height"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("width", {
    header: centeredHeader("Width"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.accessor("origin", {
    header: centeredHeader("Origin"),
    cell: ({ getValue }) => centeredCell(getValue()),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Actions</div>,
    cell: ({ row }) => <ProductActions product={row.original} />,
  }),
]);
