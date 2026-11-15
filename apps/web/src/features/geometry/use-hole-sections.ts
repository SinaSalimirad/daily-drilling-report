import type { HoleSectionCreate, HoleSectionUpdate } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const holeSectionKeys = {
  all: ['hole-sections'] as const,
  list: (wellId: string) => ['hole-sections', 'list', { wellId }] as const,
};

export function useHoleSections(wellId: string) {
  return useQuery({
    queryKey: holeSectionKeys.list(wellId),
    enabled: wellId !== '',
    queryFn: async () => (await unwrap(api.v1.wells({ wellId })['hole-sections'].get())).data,
  });
}

export function useHoleSectionMutations(wellId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['hole-sections'] });
  return {
    create: useMutation({
      mutationFn: (input: HoleSectionCreate) =>
        unwrap(api.v1.wells({ wellId })['hole-sections'].post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: HoleSectionUpdate }) =>
        unwrap(api.v1['hole-sections']({ holeSectionId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1['hole-sections']({ holeSectionId: id }).delete()),
      onSuccess,
    }),
  };
}
