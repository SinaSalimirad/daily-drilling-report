'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { PitsTable, PumpsTable, SceTable } from '@/features/equipment/EquipmentTables';
import { useProject } from '@/features/projects/use-projects';

/** Pits, pumps and solids-control equipment of a project, edited in place. */
export default function EquipmentPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);

  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`Rig equipment — ${project.data.name}`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/projects/${projectId}`} />}
          >
            Back to project
          </Button>
        }
      />
      <main className="flex flex-col gap-8 p-4">
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Pits</h2>
          <PitsTable projectId={projectId} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Pumps</h2>
          <PumpsTable projectId={projectId} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Solids-control equipment</h2>
          <SceTable projectId={projectId} />
        </section>
      </main>
    </UnitSystemProvider>
  );
}
