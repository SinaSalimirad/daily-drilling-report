"use client";

import { Button } from "@/components/ui/button";
import { InventoriesSkeleton } from "@/features/inventory/components/inventories-skeleton";
import { InventoryEmpty } from "@/features/inventory/components/inventory-empty";
import { InventorySheet } from "@/features/inventory/components/inventory-sheet";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { useInventories } from "@/features/inventory/hooks/use-inventory";

export default function InventoriesPage() {
  const { data: inventories = [], isPending, isError, isRefetching, refetch } = useInventories();

  if (isPending) return <InventoriesSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load inventories. Check your connection and try again.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Inventories</h2>
          <p className="text-xs text-muted-foreground">
            Product stock of each daily report: initial, received, used, returned and final.
          </p>
        </div>

        {inventories.length > 0 && <InventorySheet />}
      </header>

      {inventories.length > 0 ? <InventoryTable data={inventories} /> : <InventoryEmpty />}
    </section>
  );
}
