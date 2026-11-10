"use client";

import { useReports } from "../hooks/use-reports";
import { ReportForm } from "./report-form";
import { ReportsTable } from "./reports-table";

export function ReportsPage() {
  const { data, isLoading, error } = useReports();

  return (
    <main>
      <h1>Daily Mud Fluid Reports</h1>
      <ReportForm />
      {isLoading && <p>Loading…</p>}
      {error && <p role="alert">Could not load reports.</p>}
      {data && <ReportsTable data={data} />}
    </main>
  );
}
