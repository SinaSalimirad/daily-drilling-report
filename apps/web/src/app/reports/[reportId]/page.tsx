'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { useLookups } from '@/features/lookups/use-lookups';
import { useProject } from '@/features/projects/use-projects';
import { ReportEditor } from '@/features/reports/ReportEditor';
import { useReport, useReportActivities } from '@/features/reports/use-reports';
import { useSections } from '@/features/sections/use-sections';
import { useWell } from '@/features/wells/use-wells';
import { formatDate } from '@/lib/format';

export default function ReportPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const report = useReport(reportId);
  const wellId = report.data?.data.wellId ?? '';
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  const sections = useSections(wellId);
  const activities = useReportActivities(reportId);
  const lookups = useLookups();

  if (report.isError) return <QueryError error={report.error} />;
  if (well.isError) return <QueryError error={well.error} />;
  if (project.isError) return <QueryError error={project.error} />;
  if (sections.isError) return <QueryError error={sections.error} />;
  if (activities.isError) return <QueryError error={activities.error} />;
  if (lookups.isError) return <QueryError error={lookups.error} />;
  if (
    report.isPending ||
    well.isPending ||
    project.isPending ||
    sections.isPending ||
    activities.isPending ||
    lookups.isPending
  ) {
    return <Loading what="Loading report" />;
  }

  const current = report.data.data;
  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`${well.data.name} — report ${current.reportNo} (${formatDate(current.reportDate)})`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/wells/${wellId}/reports`} />}
          >
            All reports
          </Button>
        }
      />
      <main className="p-4">
        <ReportEditor
          // A saved report (new revision) starts the form clean from the server values.
          key={`${current.id}:${current.revision}`}
          report={current}
          activities={activities.data.data}
          sections={sections.data}
          lookups={lookups.data.activities}
        />
      </main>
    </UnitSystemProvider>
  );
}
