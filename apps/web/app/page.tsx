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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <TableHeader className="border-b">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id} className="border-b">
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className="border-r last:border-r-0">
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
                  <Dialog>
                    <DialogTrigger
                      render={
                        <Button>
                          <PlusIcon />
                          Add Product
                        </Button>
                      }
                    />
                    <DialogContent className="sm:max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Product</DialogTitle>
                        <DialogDescription>
                          Add product details here. Click save when you&apos;re
                          done.
                        </DialogDescription>
                      </DialogHeader>
                      <ProductListForm />
                      <DialogFooter>
                        <DialogClose
                          render={<Button variant="outline">Cancel</Button>}
                        />
                        <Button type="submit">Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </EmptyContent>
              </Empty>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function ProductListForm() {
  return (
    <FieldGroup>
      <Field>
        <Label htmlFor="product">Product Name</Label>
        <Input id="product" name="product" placeholder="e.g. Barite" />
      </Field>

      <Field>
        <Label htmlFor="size">Size</Label>
        <Input id="size" name="size" type="number" placeholder="e.g. 25" />
      </Field>

      <Field>
        <Label htmlFor="unit">Unit</Label>
        <Input id="unit" name="unit" placeholder="e.g. kg" />
      </Field>

      <Field>
        <Label htmlFor="specificGravity">Specific Gravity</Label>
        <Input
          id="specificGravity"
          name="specificGravity"
          type="number"
          step="0.01"
          placeholder="e.g. 4.20"
        />
      </Field>

      <Field>
        <Label htmlFor="origin">F/L</Label>
        <Select>
          <SelectTrigger id="origin">
            <SelectValue placeholder="Select origin" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="local">Local</SelectItem>
            <SelectItem value="foreign">Foreign</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <Label htmlFor="unitPrice">Unit Price</Label>
        <Input
          id="unitPrice"
          name="unitPrice"
          type="number"
          min="0"
          step="0.01"
          placeholder="e.g. 120"
        />
      </Field>
    </FieldGroup>
  );
}
