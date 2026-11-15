'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { UnitSystemProvider } from '@/components/UnitSystemProvider';
import { Button } from '@/components/ui/button';
import { BhaRunForm } from '@/features/bha/BhaRunForm';
import { useBhaMutations, useBhaRuns } from '@/features/bha/use-bha';
import { useProject } from '@/features/projects/use-projects';
import { useWell } from '@/features/wells/use-wells';

export default function BhaPage() {
  const { wellId } = useParams<{ wellId: string }>();
  const well = useWell(wellId);
  const project = useProject(well.data?.projectId ?? '');
  const runs = useBhaRuns(wellId);
  const m = useBhaMutations(wellId);

  if (well.isError) return <QueryError error={well.error} />;
  if (project.isError) return <QueryError error={project.error} />;
  if (runs.isError) return <QueryError error={runs.error} />;
  if (well.isPending || project.isPending || runs.isPending) return <Loading what="Loading runs" />;

  return (
    <UnitSystemProvider system={project.data.unitSystem}>
      <PageHeader
        title={`${well.data.name} — drill string`}
        actions={
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/wells/${wellId}`} />}
          >
            Well
          </Button>
        }
      />
      <main className="flex flex-col gap-10 p-4">
        {runs.data.map((run) => (
          <section key={`${run.id}:${run.updatedAt}`} className="flex flex-col gap-3">
            <h2 className="font-semibold text-sm">Run {run.runNo}</h2>
            <BhaRunForm
              run={run}
              submitLabel="Save run"
              onSubmit={(input) => m.replace.mutateAsync({ id: run.id, input: input as never })}
              onDelete={async () => {
                await m.remove.mutateAsync(run.id);
                toast.success(`Run ${run.runNo} deleted`);
              }}
            />
          </section>
        ))}
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-sm">New run</h2>
          <BhaRunForm
            key={runs.data.length}
            submitLabel="Add run"
            onSubmit={(input) => m.create.mutateAsync(input as never)}
          />
        </section>
      </main>
    </UnitSystemProvider>
  );
}
