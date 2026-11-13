"use client";

import { Button } from "@/components/ui/button";
import { ProjectEmpty } from "@/features/project/components/project-empty";
import { ProjectSheet } from "@/features/project/components/project-sheet";
import { ProjectTable } from "@/features/project/components/project-table";
import { ProjectsSkeleton } from "@/features/project/components/projects-skeleton";
import { useProjects } from "@/features/project/hooks/use-project";

export default function ProjectsPage() {
  const { data: projects = [], isPending, isError, isRefetching, refetch } = useProjects();

  if (isPending) return <ProjectsSkeleton />;

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-md border p-4">
        <p className="text-sm">Could not load projects. Check your connection and try again.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
          <p className="text-xs text-muted-foreground">
            Manage drilling projects, their operators, contractors, rig and currency.
          </p>
        </div>

        {projects.length > 0 && <ProjectSheet />}
      </header>

      {projects.length > 0 ? <ProjectTable data={projects} /> : <ProjectEmpty />}
    </section>
  );
}
