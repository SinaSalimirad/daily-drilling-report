'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { useProject, useUpdateProject } from '@/features/projects/use-projects';
import { wellColumns } from '@/features/wells/columns';
import { useWells } from '@/features/wells/use-wells';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);
  const wells = useWells(projectId);
  const update = useUpdateProject(projectId);

  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={project.data.name}
        actions={
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/equipment`} />}
            >
              Rig equipment
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/products`} />}
            >
              Price list
            </Button>
          </>
        }
      />
      <main className="flex flex-col gap-8 p-4">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Wells</h2>
            <Button
              nativeButton={false}
              render={<Link href={`/projects/${projectId}/wells/new`} />}
            >
              New well
            </Button>
          </div>
          {wells.isPending ? (
            <Loading what="Loading wells" />
          ) : wells.isError ? (
            <QueryError error={wells.error} />
          ) : (
            <DataTable columns={wellColumns} data={wells.data.data} empty="No wells yet." />
          )}
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Project details</h2>
          <ProjectForm
            key={project.data.updatedAt}
            project={project.data}
            submitLabel="Save project"
            onSubmit={async (payload) => {
              await update.mutateAsync(payload);
              toast.success('Project saved');
            }}
          />
        </section>
      </main>
    </UnitSystemProvider>
  );
}
