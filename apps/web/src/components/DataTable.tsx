'use client';

import {
  type ColumnDef,
  createColumnHelper,
  type RowData,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// TanStack Table v9 rendered with the shadcn table. Column definitions live in each
// feature's columns.tsx (docs/02) and are built with `columnHelper<Row>()`.

/** Core table only: rows and cells, no sorting or paging in the browser (the API sorts). */
export const dataTableFeatures = tableFeatures({});

export const columnHelper = <T extends RowData>() =>
  createColumnHelper<typeof dataTableFeatures, T>();

export function DataTable<T extends RowData>({
  columns,
  data,
  empty = 'Nothing here yet.',
}: {
  // biome-ignore lint/suspicious/noExplicitAny: cell value types differ per column
  columns: ColumnDef<typeof dataTableFeatures, T, any>[];
  data: T[];
  empty?: string;
}) {
  const table = useTable({ features: dataTableFeatures, columns, data });
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-muted-foreground">
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
