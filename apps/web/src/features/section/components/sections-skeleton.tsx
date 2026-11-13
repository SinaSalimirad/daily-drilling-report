import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SECTION_PAGE_SIZE, SECTION_ROW_CLASS, SECTION_TABLE_MIN_HEIGHT } from "../constants";

const ROWS = Array.from({ length: SECTION_PAGE_SIZE }, (_, i) => `skeleton-row-${i}`);

// One entry per column in section-columns.tsx, same order. `cell` is the placeholder size.
const COLUMNS = [
  { id: "counter", header: "w-4", cell: "w-4" },
  { id: "name", header: "w-16", cell: "w-32" },
  { id: "wellName", header: "w-12", cell: "w-24" },
  { id: "sequence", header: "w-16", cell: "w-8" },
  { id: "actions", header: "w-14", cell: "size-8 rounded-md" },
] as const;

// Mirrors SectionsPage + SectionTable so nothing jumps when the data arrives.
export function SectionsSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Loading sections">
      {/* Page header: title, description, Add button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>

        <Skeleton className="h-10 w-32" />
      </div>

      <div className="flex flex-col gap-2 rounded-sm border p-2">
        {/* Toolbar: search input + sort button */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-8 w-full max-w-sm" />
          <Skeleton className="h-8 w-48" />
        </div>

        <div
          className="w-full overflow-hidden rounded-md border"
          style={{ minHeight: SECTION_TABLE_MIN_HEIGHT }}
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
                <TableRow key={rowKey} className={SECTION_ROW_CLASS}>
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
