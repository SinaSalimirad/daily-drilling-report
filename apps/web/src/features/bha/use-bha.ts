import type { BhaRunInput } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const bhaKeys = {
  all: ['bha-runs'] as const,
  list: (wellId: string) => ['bha-runs', 'list', { wellId }] as const,
};

export function useBhaRuns(wellId: string) {
  return useQuery({
    queryKey: bhaKeys.list(wellId),
    enabled: wellId !== '',
    queryFn: async () => (await unwrap(api.v1.wells({ wellId })['bha-runs'].get())).data,
  });
}

export function useBhaMutations(wellId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: bhaKeys.all });
  return {
    create: useMutation({
      mutationFn: async (input: BhaRunInput) =>
        (await unwrap(api.v1.wells({ wellId })['bha-runs'].post(input))).data,
      onSuccess,
    }),
    replace: useMutation({
      mutationFn: async ({ id, input }: { id: string; input: BhaRunInput }) =>
        (await unwrap(api.v1['bha-runs']({ bhaRunId: id }).put(input))).data,
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1['bha-runs']({ bhaRunId: id }).delete()),
      onSuccess,
    }),
  };
}
