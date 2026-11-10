"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useDeleteReport } from "../hooks/use-reports";
import type { Report } from "../types";

const col = createColumnHelper<Report>();

export function ReportsTable({ data }: { data: Report[] }) {
  const del = useDeleteReport();

  const table = useReactTable({
    data,
    columns: [
      col.accessor("wellName", { header: "Well" }),
      col.accessor("reportDate", { header: "Date" }),
      col.accessor("depthM", { header: "Depth (m)" }),
      col.accessor("mudWeightPpg", { header: "Mud weight (ppg)" }),
      col.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <button type="button" onClick={() => del.mutate(row.original.id)}>
            Delete
          </button>
        ),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((group) => (
          <tr key={group.id}>
            {group.headers.map((h) => (
              <th
                key={h.id}
                onClick={h.column.getToggleSortingHandler()}
                style={{ textAlign: "left", paddingRight: 16 }}
              >
                {flexRender(h.column.columnDef.header, h.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} style={{ paddingRight: 16 }}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
