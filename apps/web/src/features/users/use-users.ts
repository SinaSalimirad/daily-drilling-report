import type { UserCreate, UserUpdate, WellMembersPut } from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export function useUsers() {
  return useQuery({
    queryKey: ['users', 'list'] as const,
    queryFn: async () => (await unwrap(api.v1.users.get())).data,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  return {
    create: useMutation({
      mutationFn: (input: UserCreate) => unwrap(api.v1.users.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UserUpdate }) =>
        unwrap(api.v1.users({ userId: id }).patch(input)),
      onSuccess,
    }),
    setPassword: useMutation({
      mutationFn: ({ id, password }: { id: string; password: string }) =>
        unwrap(api.v1.users({ userId: id }).password.put({ password })),
    }),
  };
}

/** Engineers and clients, for the assignment of wells. */
export function useAssignableUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'assignable'] as const,
    enabled,
    queryFn: async () => (await unwrap(api.v1.users.assignable.get())).data,
  });
}

export function useWellMembers(wellId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['users', 'members', wellId] as const,
    enabled: enabled && wellId !== '',
    queryFn: async () => (await unwrap(api.v1.wells({ wellId }).members.get())).data,
  });
}

export function useReplaceWellMembers(wellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: WellMembersPut) =>
      (await unwrap(api.v1.wells({ wellId }).members.put(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users', 'members', wellId] }),
  });
}

export function useReportEdits(reportId: string) {
  return useQuery({
    queryKey: ['reports', 'edits', reportId] as const,
    queryFn: async () => (await unwrap(api.v1.reports({ reportId }).edits.get())).data,
  });
}
