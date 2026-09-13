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

import {
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { FolderCodeIcon, PlusIcon } from "lucide-react";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

type DataTable = {
  rowNumber: number;
  product: string;
  size: number;
  unit: string;
  specificGravity: number;
  origin: "local" | "foreign";
  unitPrice: number;
};

const features = tableFeatures({});

const columnHelper = createColumnHelper<typeof features, DataTable>();

const columns = columnHelper.columns([
  columnHelper.accessor("rowNumber", {
    header: "No.",
    cell: (info) => `#${info.getValue()}`,
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

export default function ProductionList() {
  const [data, setData] = useState<DataTable[]>([]);

  const table = useTable(
    {
      key: "production-list-table",
      debugTable: true,
      features,
      columns,
      data,
    },
    (state) => state,
  );

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
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
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-80 p-0">
              <Empty className="h-full border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderCodeIcon />
                  </EmptyMedia>

                  <EmptyTitle>No products found</EmptyTitle>

                  <EmptyDescription className="max-w-md">
                    Your product list is empty. Add a product to start building
                    your inventory.
                  </EmptyDescription>
                </EmptyHeader>

                <EmptyContent className="flex-row justify-center">
                  <Button>
                    <PlusIcon />
                    Add Product
                  </Button>
                </EmptyContent>
              </Empty>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
