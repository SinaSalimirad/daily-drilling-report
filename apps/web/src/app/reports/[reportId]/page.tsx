'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { usePits } from '@/features/equipment/use-equipment';
import { useLookups } from '@/features/lookups/use-lookups';
import { useProject } from '@/features/projects/use-projects';
import { InventorySection } from '@/features/reports/InventorySection';
import { PitReadingsSection } from '@/features/reports/PitReadingsSection';
import { ReportEditor } from '@/features/reports/ReportEditor';
import { RevisionConflictDialog } from '@/features/reports/RevisionConflictDialog';
import { SubmitDialog } from '@/features/reports/SubmitDialog';
import {
  useInventory,
  usePitReadings,
  useReport,
  useReportActivities,
} from '@/features/reports/use-reports';
import { WarningsPanel } from '@/features/reports/WarningsPanel';
import { useSections } from '@/features/sections/use-sections';
import { useWell } from '@/features/wells/use-wells';
import { formatDate } from '@/lib/format';

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const queryClient = useQueryClient();
  const [conflict, setConflict] = useState(false);
  const report = useReport(reportId);
  const wellId = report.data?.data.wellId ?? '';
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  const sections = useSections(wellId);
  const activities = useReportActivities(reportId);
  const lookups = useLookups();
  const pits = usePits(project.data?.id ?? '');
  const pitReadings = usePitReadings(reportId);
  const inventory = useInventory(reportId);

  if (report.isError) return <QueryError error={report.error} />;
  if (well.isError) return <QueryError error={well.error} />;
  if (project.isError) return <QueryError error={project.error} />;
  if (sections.isError) return <QueryError error={sections.error} />;
  if (activities.isError) return <QueryError error={activities.error} />;
  if (lookups.isError) return <QueryError error={lookups.error} />;
  if (pits.isError) return <QueryError error={pits.error} />;
  if (pitReadings.isError) return <QueryError error={pitReadings.error} />;
  if (inventory.isError) return <QueryError error={inventory.error} />;
  if (
    report.isPending ||
    well.isPending ||
    project.isPending ||
    sections.isPending ||
    activities.isPending ||
    lookups.isPending ||
    pits.isPending ||
    pitReadings.isPending ||
    inventory.isPending
  ) {
    return <Loading what="Loading report" />;
  }

  const current = report.data.data;
  const warnings = report.data.warnings ?? [];
  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`${well.data.name} — report ${current.reportNo} (${formatDate(current.reportDate)})`}
        actions={
          <>
            <StatusBadge report={current} />
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/wells/${wellId}/reports`} />}
            >
              All reports
            </Button>
            <SubmitDialog
              report={current}
              warnings={warnings}
              onConflict={() => setConflict(true)}
            />
          </>
        }
      />
      <main className="flex flex-col gap-8 p-4">
        {current.editedAfterSubmit ? (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm">
            This report was edited after it was submitted (revision {current.revision}).
          </p>
        ) : null}
        <WarningsPanel warnings={warnings} />
        <PitReadingsSection
          // New readings (a save, or the carry-over of a new report) start the table clean.
          key={JSON.stringify(pitReadings.data.data.readings)}
          reportId={current.id}
          pits={pits.data}
          readings={pitReadings.data.data}
          mudTypes={lookups.data.pitMudTypes}
        />
        <InventorySection
          // Saved moves, or a change of an earlier day, start the table from the server values.
          key={JSON.stringify(inventory.data.data.rows.map((r) => [r.received, r.used, r.initial]))}
          reportId={current.id}
          inventory={inventory.data.data}
          currency={project.data.currency}
        />
        <ReportEditor
          // A saved report (new revision) starts the form clean from the server values.
          key={`${current.id}:${current.revision}`}
          report={current}
          activities={activities.data.data}
          sections={sections.data}
          lookups={lookups.data.activities}
          onConflict={() => setConflict(true)}
        />
        <RevisionConflictDialog
          open={conflict}
          onReload={async () => {
            await queryClient.invalidateQueries({ queryKey: ['reports'] });
            setConflict(false);
          }}
        />
      </main>
    </UnitSystemProvider>
  );
}

function StatusBadge({ report }: { report: { status: string; revision: number } }) {
  const submitted = report.status === 'submitted';
  return (
    <span
      className={
        submitted
          ? 'rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-400'
          : 'rounded-full bg-muted px-2.5 py-0.5 font-medium text-muted-foreground text-xs'
      }
    >
      {submitted ? 'Submitted' : 'Draft'}
    </span>
  );
}
