import type { ReactTable } from "@tanstack/react-table";
import { ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DataTableFeatures } from "@/lib/table-feature";
import type { Product } from "../type";

export function ProductTableToolbar({ table }: { table: ReactTable<DataTableFeatures, Product> }) {
  const nameColumn = table.getColumn("name");
  const sortDirection = nameColumn?.getIsSorted();

  const handleSort = () => {
    nameColumn?.toggleSorting(sortDirection === "asc");
  };

  return (
    <section className="flex items-center justify-between gap-2">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-3 size-4 text-muted-foreground" />

        <Input
          className="h-10 w-full pl-8 text-sm placeholder:text-xs"
          aria-label="Search products by name"
          placeholder="Search Product name..."
          value={(nameColumn?.getFilterValue() as string) ?? ""}
          onChange={(e) => {
            nameColumn?.setFilterValue(e.target.value || undefined);
            table.setPageIndex(0);
          }}
        />
      </div>

      <Button variant="outline" className="h-10 gap-3 px-3" onClick={handleSort}>
        <span>Sort by</span>

        <span>(Name {sortDirection === "desc" ? "Z → A" : "A → Z"})</span>

        <ChevronDown
          className={`size-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
        />
      </Button>
    </section>
  );
}
