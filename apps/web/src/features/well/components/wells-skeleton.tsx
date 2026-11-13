import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { WELL_PAGE_SIZE, WELL_ROW_CLASS, WELL_TABLE_MIN_HEIGHT } from "../constants";

const ROWS = Array.from({ length: WELL_PAGE_SIZE }, (_, i) => `skeleton-row-${i}`);

// One entry per column in well-columns.tsx, same order. `cell` is the placeholder size.
const COLUMNS = [
  { id: "counter", header: "w-4", cell: "w-4" },
  { id: "name", header: "w-16", cell: "w-32" },
  { id: "projectName", header: "w-16", cell: "w-24" },
  { id: "designation", header: "w-20", cell: "w-20" },
  { id: "wellType", header: "w-16", cell: "w-16" },
  { id: "rigName", header: "w-10", cell: "w-16" },
  { id: "rigType", header: "w-16", cell: "w-16" },
  { id: "spudDate", header: "w-16", cell: "w-20" },
  { id: "waterDepthM", header: "w-24", cell: "w-10" },
  { id: "actions", header: "w-14", cell: "size-8 rounded-md" },
] as const;

// Mirrors WellsPage + WellTable so nothing jumps when the data arrives.
export function WellsSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Loading wells">
      {/* Page header: title, description, Add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <Skeleton className="h-10 w-28" />
      </div>

      <div className="flex flex-col gap-2 rounded-sm border p-2">
        {/* Toolbar: search input + sort button */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-8 w-full max-w-sm" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div
          className="w-full overflow-hidden rounded-md border"
          style={{ minHeight: WELL_TABLE_MIN_HEIGHT }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col.id}>
                    <div className="flex justify-center">
                      <Skeleton className={`h-4 ${col.header}`} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {ROWS.map((rowKey) => (
                <TableRow key={rowKey} className={WELL_ROW_CLASS}>
                  {COLUMNS.map((col) => (
                    <TableCell key={col.id}>
                      <div className={col.id === "name" ? "" : "flex justify-center"}>
                        <Skeleton className={`h-4 ${col.cell}`} />
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination: row count, page label, prev/next buttons */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-16" />

          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
    </section>
  );
}
