import type { ProjectCreate, ProjectUpdate } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

// Query keys: [feature, 'list', filters] and [feature, 'detail', id] (docs/02).
export const projectKeys = {
  all: ['projects'] as const,
  list: (filters: { archived?: boolean }) => ['projects', 'list', filters] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

export function useProjects(filters: { archived?: boolean } = {}) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () =>
      unwrap(
        api.v1.projects.get({
          // Eden types a query by the schema's parsed output; the wire takes the strings.
          query: {
            pageSize: 100,
            sort: 'name:asc',
            archived: filters.archived ? 'true' : 'false',
          } as never,
        }),
      ),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () => (await unwrap(api.v1.projects({ projectId }).get())).data,
    /** Pages that learn the project id from another query pass '' until it arrives. */
    enabled: projectId !== '',
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectCreate) => (await unwrap(api.v1.projects.post(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectUpdate) =>
      (await unwrap(api.v1.projects({ projectId }).patch(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}
