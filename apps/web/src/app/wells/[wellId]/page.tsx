'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { useCan } from '@/features/auth/use-session';
import { HoleSectionsTable } from '@/features/geometry/HoleSectionsTable';
import { useProject } from '@/features/projects/use-projects';
import { SectionsTable } from '@/features/sections/SectionsTable';
import { SurveyTable } from '@/features/survey/SurveyTable';
import { WellMembers } from '@/features/users/WellMembers';
import { useUpdateWell, useWell } from '@/features/wells/use-wells';
import { WellForm } from '@/features/wells/WellForm';

export default function WellPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const well = useWell(wellId);
  const projectId = well.data?.projectId ?? '';
  const project = useProject(projectId);
  const update = useUpdateWell(wellId);
  const canAssign = useCan('well:assign');

  if (well.isPending) return <Loading what="Loading well" />;
  if (well.isError) return <QueryError error={well.error} />;
  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={well.data.name}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/wells/${wellId}/reports`} />}
            >
              Reports
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/wells/${wellId}/bha`} />}
            >
              Drill string
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}`} />}
            >
              {project.data.name}
            </Button>
          </>
        }
      />
      <main className="flex flex-col gap-8 p-4">
        <WellForm
          key={well.data.updatedAt}
          well={well.data}
          submitLabel="Save well"
          onSubmit={async (payload) => {
            await update.mutateAsync(payload);
            toast.success('Well saved');
          }}
        />
        <section aria-labelledby="sections-heading" className="flex flex-col gap-3">
          <h2 id="sections-heading" className="font-semibold text-sm">
            Drilling sections
          </h2>
          <SectionsTable wellId={wellId} />
        </section>
        <section aria-labelledby="geometry-heading" className="flex flex-col gap-3">
          <h2 id="geometry-heading" className="font-semibold text-sm">
            Wellbore geometry
          </h2>
          <HoleSectionsTable wellId={wellId} />
        </section>
        {canAssign ? (
          <section aria-labelledby="members-heading" className="flex flex-col gap-3">
            <h2 id="members-heading" className="font-semibold text-sm">
              Members
            </h2>
            <WellMembers wellId={wellId} />
          </section>
        ) : null}
        <section aria-labelledby="survey-heading" className="flex flex-col gap-3">
          <h2 id="survey-heading" className="font-semibold text-sm">
            Directional survey
          </h2>
          <SurveyTable wellId={wellId} />
        </section>
      </main>
    </UnitSystemProvider>
  );
}
