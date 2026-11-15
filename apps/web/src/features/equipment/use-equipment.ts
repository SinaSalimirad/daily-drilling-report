import type {
  PitCreate,
  PitUpdate,
  PumpCreate,
  PumpUpdate,
  SceUnitCreate,
  SceUnitUpdate,
} from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

// Rig equipment of a project: pits, pumps, solids-control units. Small fixed collections,
// each returned whole (docs/04). DELETE answers 204, or 200 with the archived row when a
// reading refers to it (docs/03).

export const equipmentKeys = {
  pits: (projectId: string) => ['pits', 'list', { projectId }] as const,
  pumps: (projectId: string) => ['pumps', 'list', { projectId }] as const,
  sce: (projectId: string) => ['sce-units', 'list', { projectId }] as const,
};

/** Active rows only. Eden types a query by the schema's parsed output; the wire takes strings. */
const ACTIVE = { archived: 'false' } as never;

/** True when the API archived the row instead of deleting it. */
export const wasArchived = (result: unknown) =>
  typeof result === 'object' && result !== null && 'data' in result;

// --- pits ---
export function usePits(projectId: string) {
  return useQuery({
    queryKey: equipmentKeys.pits(projectId),
    queryFn: async () =>
      (await unwrap(api.v1.projects({ projectId }).pits.get({ query: ACTIVE }))).data,
  });
}

export function usePitMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['pits'] });
  return {
    create: useMutation({
      mutationFn: (input: PitCreate) => unwrap(api.v1.projects({ projectId }).pits.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: PitUpdate }) =>
        unwrap(api.v1.pits({ pitId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1.pits({ pitId: id }).delete()),
      onSuccess,
    }),
  };
}

// --- pumps ---
export function usePumps(projectId: string) {
  return useQuery({
    queryKey: equipmentKeys.pumps(projectId),
    queryFn: async () =>
      (await unwrap(api.v1.projects({ projectId }).pumps.get({ query: ACTIVE }))).data,
  });
}

export function usePumpMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['pumps'] });
  return {
    create: useMutation({
      mutationFn: (input: PumpCreate) => unwrap(api.v1.projects({ projectId }).pumps.post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: PumpUpdate }) =>
        unwrap(api.v1.pumps({ pumpId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1.pumps({ pumpId: id }).delete()),
      onSuccess,
    }),
  };
}

// --- solids-control equipment ---
export function useSceUnits(projectId: string) {
  return useQuery({
    queryKey: equipmentKeys.sce(projectId),
    queryFn: async () =>
      (await unwrap(api.v1.projects({ projectId })['sce-units'].get({ query: ACTIVE }))).data,
  });
}

export function useSceMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ['sce-units'] });
  return {
    create: useMutation({
      mutationFn: (input: SceUnitCreate) =>
        unwrap(api.v1.projects({ projectId })['sce-units'].post(input)),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SceUnitUpdate }) =>
        unwrap(api.v1['sce-units']({ sceUnitId: id }).patch(input)),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => unwrap(api.v1['sce-units']({ sceUnitId: id }).delete()),
      onSuccess,
    }),
  };
}
