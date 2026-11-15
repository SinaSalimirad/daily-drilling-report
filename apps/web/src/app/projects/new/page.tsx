'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { ProjectForm } from '@/features/projects/ProjectForm';
import { useCreateProject } from '@/features/projects/use-projects';

export default function NewProjectPage() {
  const router = useRouter();
  const create = useCreateProject();
  return (
    <>
      <PageHeader title="New project" />
      <main className="p-4">
        <ProjectForm
          submitLabel="Create project"
          onSubmit={async (payload) => {
            const project = await create.mutateAsync(payload);
            toast.success(`Project ${project.name} created`);
            router.push(`/projects/${project.id}`);
          }}
        />
      </main>
    </>
  );
}
