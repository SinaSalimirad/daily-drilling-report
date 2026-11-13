"use client";

import { Button } from "@/components/ui/button";
import { WellEmpty } from "@/features/well/components/well-empty";
import { WellSheet } from "@/features/well/components/well-sheet";
import { WellTable } from "@/features/well/components/well-table";
import { WellsSkeleton } from "@/features/well/components/wells-skeleton";
import { useWells } from "@/features/well/hooks/use-well";

export default function WellsPage() {
  const { data: wells = [], isPending, isError, isRefetching, refetch } = useWells();

  if (isPending) return <WellsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load wells. Check your connection and try again.</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Wells</h2>
          <p className="text-xs text-muted-foreground">
            Manage the wells of each project, their designation, rig and spud date.
          </p>
        </div>

        {wells.length > 0 && <WellSheet />}
      </header>

      {wells.length > 0 ? <WellTable data={wells} /> : <WellEmpty />}
    </section>
  );
}
