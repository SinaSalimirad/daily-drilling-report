'use client';

import Link from 'next/link';
import { DataTable } from '@/components/DataTable';
import { PageHeader } from '@/components/PageHeader';
import { Loading, QueryError } from '@/components/QueryState';
import { Button } from '@/components/ui/button';
import { projectColumns } from '@/features/projects/columns';
import { useProjects } from '@/features/projects/use-projects';

export default function ProjectsPage() {
  const projects = useProjects();
  return (
    <>
      <PageHeader
        title="Projects"
        actions={
          <Button nativeButton={false} render={<Link href="/projects/new" />}>
            New project
          </Button>
        }
      />
      <main className="p-4">
        {projects.isPending ? (
          <Loading what="Loading projects" />
        ) : projects.isError ? (
          <QueryError error={projects.error} />
        ) : (
          <DataTable columns={projectColumns} data={projects.data.data} empty="No projects yet." />
        )}
      </main>
    </>
  );
}
