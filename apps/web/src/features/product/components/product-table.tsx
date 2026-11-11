import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { DataTableFeatures } from "@/lib/table-feature";
import type { Product } from "../type";
import { useDeleteProduct } from "../hooks/use-product";

const columnHelper = createColumnHelper<DataTableFeatures, Product>();

export function ProductTable({ data }: { data: Product[] }) {
  const { mutate: removeProductMutate } = useDeleteProduct();

  const table = useReactTable({
    data,
    columns: [
      columnHelper.accessor("name", { header: "Name" }),
      columnHelper.accessor("size", { header: "Size" }),
      columnHelper.accessor("width", { header: "Width" }),
      columnHelper.accessor("height", { header: "Height" }),
      columnHelper.accessor("unit", { header: "Unit" }),
      columnHelper.accessor("specificGravity", { header: "Specific Gravity" }),
      columnHelper.accessor("origin", { header: "Origin" }),
      columnHelper.accessor("price", { header: "Price" }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => removeProductMutate(row.original.id)}
          >
            Delete
          </button>
        ),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
}
