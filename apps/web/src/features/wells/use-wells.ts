import type { WellCreate, WellUpdate } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const wellKeys = {
  all: ['wells'] as const,
  list: (projectId: string) => ['wells', 'list', { projectId }] as const,
  detail: (id: string) => ['wells', 'detail', id] as const,
};

export function useWells(projectId: string) {
  return useQuery({
    queryKey: wellKeys.list(projectId),
    queryFn: () =>
      unwrap(
        api.v1
          .projects({ projectId })
          // Eden types a query by the schema's parsed output; the wire takes the strings.
          .wells.get({ query: { pageSize: 100, sort: 'name:asc' } as never }),
      ),
  });
}

export function useWell(wellId: string) {
  return useQuery({
    queryKey: wellKeys.detail(wellId),
    queryFn: async () => (await unwrap(api.v1.wells({ wellId }).get())).data,
  });
}

export function useCreateWell(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WellCreate) =>
      (await unwrap(api.v1.projects({ projectId }).wells.post(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wellKeys.all }),
  });
}

export function useUpdateWell(wellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WellUpdate) =>
      (await unwrap(api.v1.wells({ wellId }).patch(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wellKeys.all }),
  });
}
