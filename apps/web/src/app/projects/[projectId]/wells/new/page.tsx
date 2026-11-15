'use client';

import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { useProject } from '@/features/projects/use-projects';
import { useCreateWell } from '@/features/wells/use-wells';
import { WellForm } from '@/features/wells/WellForm';

export default function NewWellPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const project = useProject(projectId);
  const create = useCreateWell(projectId);

  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader title={`New well — ${project.data.name}`} />
      <main className="p-4">
        <WellForm
          submitLabel="Create well"
          onSubmit={async (payload) => {
            const well = await create.mutateAsync(payload);
            toast.success(`Well ${well.name} created`);
            router.push(`/projects/${projectId}`);
          }}
        />
      </main>
    </UnitSystemProvider>
  );
}
