import type { SectionCreate, SectionUpdate } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const sectionKeys = {
  all: ['sections'] as const,
  list: (wellId: string) => ['sections', 'list', { wellId }] as const,
};

export function useSections(wellId: string) {
  return useQuery({
    queryKey: sectionKeys.list(wellId),
    queryFn: async () => (await unwrap(api.v1.wells({ wellId }).sections.get())).data,
  });
}

export function useSectionMutations(wellId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: sectionKeys.all });
  return {
    create: useMutation({
      mutationFn: (input: SectionCreate) => unwrap(api.v1.wells({ wellId }).sections.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SectionUpdate }) =>
        unwrap(api.v1.sections({ sectionId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1.sections({ sectionId: id }).delete()),
      onSuccess,
    }),
  };
}
