"use client";

import { Button } from "@/components/ui/button";
import { ReportEmpty } from "@/features/report/components/report-empty";
import { ReportSheet } from "@/features/report/components/report-sheet";
import { ReportTable } from "@/features/report/components/report-table";
import { ReportsSkeleton } from "@/features/report/components/reports-skeleton";
import { useReports } from "@/features/report/hooks/use-report";

export default function ReportsPage() {
  const { data: reports = [], isPending, isError, isRefetching, refetch } = useReports();

  if (isPending) return <ReportsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load reports. Check your connection and try again.</p>
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
          <h2 className="text-lg font-semibold tracking-tight">Reports</h2>
          <p className="text-xs text-muted-foreground">
            Daily drilling reports of each well: mud type, status and depths.
          </p>
        </div>

        {reports.length > 0 && <ReportSheet />}
      </header>

      {reports.length > 0 ? <ReportTable data={reports} /> : <ReportEmpty />}
    </section>
  );
}
