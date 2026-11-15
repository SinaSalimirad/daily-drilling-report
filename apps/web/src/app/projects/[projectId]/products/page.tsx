'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { PriceListTable } from '@/features/products/ProductTables';
import { useProject } from '@/features/projects/use-projects';

/** Price list of a project: pick catalogue products, set origin and price per package. */
export default function PriceListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const project = useProject(projectId);

  if (project.isPending) return <Loading what="Loading project" />;
  if (project.isError) return <QueryError error={project.error} />;

  return (
    <>
      <PageHeader
        title={`Price list — ${project.data.name}`}
        actions={
          <>
            <Button variant="outline" nativeButton={false} render={<Link href="/products" />}>
              Product catalogue
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/projects/${projectId}`} />}
            >
              Back to project
            </Button>
          </>
        }
      />
      <main className="flex flex-col gap-2 p-4">
        <p className="text-muted-foreground text-sm">
          Price per package, in {project.data.currency}.
        </p>
        <PriceListTable projectId={projectId} currency={project.data.currency} />
      </main>
    </>
  );
}
