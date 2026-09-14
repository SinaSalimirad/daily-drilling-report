"use client";

import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ProductListForm } from "./_components/product-list";

type DataTable = {
  rowNumber: number;
  product: string;
  size?: number;
  unit?: string;
  specificGravity?: number;
  origin: "local" | "foreign";
  unitPrice?: number;
};

const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, DataTable>();

const columns = columnHelper.columns([
  columnHelper.accessor("rowNumber", {
    header: "#",
  }),

  columnHelper.accessor("product", {
    header: "Product Name",
  }),

  columnHelper.accessor("size", {
    header: "Size",
  }),

  columnHelper.accessor("unit", {
    header: "Unit",
  }),

  columnHelper.accessor("specificGravity", {
    header: "S.G. (kg/l)",
  }),

  columnHelper.accessor("origin", {
    header: "F/L",
  }),

  columnHelper.accessor("unitPrice", {
    header: "Unit Price",
  }),
]);

export default function ProductPage() {
  const [data] = useState<DataTable[]>([]);
  const [open, setOpen] = useState(false);

  const table = useTable(
    {
      key: "product-list-table",
      features,
      columns,
      data,
    },
    (state) => state,
  );

  function handleCreateProduct() {
    setOpen(true);
  }

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Products </h1>
          <p className="text-sm text-muted-foreground">
            Manage and organize your drilling fluid products.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full sm:w-64"
          />

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}>
              Create Product
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleCreateProduct}>
                  Import From Scratch
                </DropdownMenuItem>

                <DropdownMenuItem>Import From History</DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline">Print</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-11 border-r font-medium last:border-r-0"
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="border-r last:border-r-0"
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="font-medium">No products yet</p>

                    <p className="text-sm text-muted-foreground">
                      Add your first product to get started.
                    </p>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateProduct}
                    >
                      Create Product
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ProductListForm open={open} onOpenChange={setOpen} />
    </main>
  );
}
