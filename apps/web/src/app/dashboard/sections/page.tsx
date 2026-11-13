"use client";

import { Button } from "@/components/ui/button";
import { SectionEmpty } from "@/features/section/components/section-empty";
import { SectionSheet } from "@/features/section/components/section-sheet";
import { SectionTable } from "@/features/section/components/section-table";
import { SectionsSkeleton } from "@/features/section/components/sections-skeleton";
import { useSections } from "@/features/section/hooks/use-section";

export default function SectionsPage() {
  const { data: sections = [], isPending, isError, isRefetching, refetch } = useSections();

  if (isPending) return <SectionsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load sections. Check your connection and try again.</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Sections</h2>
          <p className="text-xs text-muted-foreground">
            Manage the hole sections of each well and the order they are drilled in.
          </p>
        </div>

        {sections.length > 0 && <SectionSheet />}
      </header>

      {sections.length > 0 ? <SectionTable data={sections} /> : <SectionEmpty />}
    </section>
  );
}
