'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { useProject } from '@/features/projects/use-projects';
import { reportColumns } from '@/features/reports/columns';
import { NewReportDialog } from '@/features/reports/NewReportDialog';
import { REPORT_PAGE_SIZE, useReports } from '@/features/reports/use-reports';
import { useSections } from '@/features/sections/use-sections';
import { useWell } from '@/features/wells/use-wells';

export default function WellReportsPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const [page, setPage] = useState(1);
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  const sections = useSections(wellId);
  const reports = useReports(wellId, page);

  if (well.isPending || sections.isPending || reports.isPending) {
    return <Loading what="Loading reports" />;
  }
  if (well.isError) return <QueryError error={well.error} />;
  if (sections.isError) return <QueryError error={sections.error} />;
  if (reports.isError) return <QueryError error={reports.error} />;
  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  const { data, meta } = reports.data;
  const lastPage = Math.max(1, Math.ceil(meta.total / REPORT_PAGE_SIZE));

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`${well.data.name} — reports`}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/wells/${wellId}`} />}
            >
              Well
            </Button>
            <NewReportDialog
              wellId={wellId}
              spudDate={well.data.spudDate}
              sections={sections.data}
            />
          </>
        }
      />
      <main className="flex flex-col gap-4 p-4">
        {sections.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add a drilling section on the well page before creating the first report.
          </p>
        ) : null}
        <DataTable
          columns={reportColumns(sections.data)}
          data={data}
          empty="No reports yet. Create the first one."
        />
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= lastPage}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </main>
    </UnitSystemProvider>
  );
}
