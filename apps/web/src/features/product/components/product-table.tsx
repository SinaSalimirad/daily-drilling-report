import { createColumnHelper, flexRender, useTable } from "@tanstack/react-table";
import { useMemo } from "react";
import { type DataTableFeatures, features } from "@/lib/table-feature";
import { useDeleteProduct } from "../hooks/use-product";
import type { Product } from "../type";

const columnHelper = createColumnHelper<DataTableFeatures, Product>();

export function ProductTable({ data }: { data: Product[] }) {
  const { mutate: removeProductMutate } = useDeleteProduct();

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", { header: "Name" }),
        columnHelper.accessor("size", { header: "Size" }),
        columnHelper.accessor("width", { header: "Width" }),
        columnHelper.accessor("height", { header: "Height" }),
        columnHelper.accessor("unit", { header: "Unit" }),
        columnHelper.accessor("specificGravity", {
          header: "Specific Gravity",
        }),
        columnHelper.accessor("origin", { header: "Origin" }),
        columnHelper.accessor("price", { header: "Price" }),
        columnHelper.display({
          id: "actions",
          header: "",
          cell: ({ row }) => (
            <button type="button" onClick={() => removeProductMutate(row.original.id)}>
              Delete
            </button>
          ),
        }),
      ]),
    [removeProductMutate],
  );

  const table = useTable({
    features,
    data,
    columns,
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
