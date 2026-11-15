import type {
  InventoryPut,
  PitReadingsPut,
  PumpReadingsPut,
  ReportActivitiesPut,
  ReportCreate,
  ReportSubmit,
  ReportUpdate,
  VolumeEntriesPut,
} from '@ddr/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { unwrap } from '@/lib/api-error';

export const reportKeys = {
  all: ['reports'] as const,
  list: (wellId: string, page: number) => ['reports', 'list', { wellId, page }] as const,
  detail: (id: string) => ['reports', 'detail', id] as const,
};

export const REPORT_PAGE_SIZE = 20;

/** One page of the reports of a well, newest first. */
export function useReports(wellId: string, page: number) {
  return useQuery({
    queryKey: reportKeys.list(wellId, page),
    placeholderData: (previous) => previous,
    queryFn: () =>
      unwrap(
        api.v1
          .wells({ wellId })
          // Eden types a query by the schema's parsed output; the wire takes the strings.
          .reports.get({
            query: { page: String(page), pageSize: String(REPORT_PAGE_SIZE) } as never,
          }),
      ),
  });
}

/** The newest report of a well (the base of the proposed number and date). */
export function useLatestReport(wellId: string) {
  return useQuery({
    queryKey: ['reports', 'latest', wellId],
    queryFn: async () =>
      (await unwrap(api.v1.wells({ wellId }).reports.get({ query: { pageSize: '1' } as never })))
        .data[0] ?? null,
  });
}

export function useCreateReport(wellId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportCreate) =>
      (await unwrap(api.v1.wells({ wellId }).reports.post(input))).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: reportKeys.detail(reportId),
    queryFn: () => unwrap(api.v1.reports({ reportId }).get()),
  });
}

/** Header update at the revision the form was loaded with. */
export function useUpdateReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReportUpdate) => unwrap(api.v1.reports({ reportId }).patch(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export const activityKeys = {
  list: (reportId: string) => ['reports', 'activities', reportId] as const,
};

export function useReportActivities(reportId: string) {
  return useQuery({
    queryKey: activityKeys.list(reportId),
    queryFn: () => unwrap(api.v1.reports({ reportId }).activities.get()),
  });
}

export function useReplaceActivities(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportActivitiesPut) =>
      unwrap(api.v1.reports({ reportId }).activities.put(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export const pitReadingKeys = {
  list: (reportId: string) => ['reports', 'pit-readings', reportId] as const,
};

export function usePitReadings(reportId: string) {
  return useQuery({
    queryKey: pitReadingKeys.list(reportId),
    queryFn: () => unwrap(api.v1.reports({ reportId })['pit-readings'].get()),
  });
}

export function useReplacePitReadings(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PitReadingsPut) =>
      unwrap(api.v1.reports({ reportId })['pit-readings'].put(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useSubmitReport(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReportSubmit) => unwrap(api.v1.reports({ reportId }).submit.post(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export const inventoryKeys = {
  detail: (reportId: string) => ['reports', 'inventory', reportId] as const,
};

export function useInventory(reportId: string) {
  return useQuery({
    queryKey: inventoryKeys.detail(reportId),
    queryFn: () => unwrap(api.v1.reports({ reportId }).inventory.get()),
  });
}

export function useReplaceInventory(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InventoryPut) => unwrap(api.v1.reports({ reportId }).inventory.put(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useVolumes(reportId: string) {
  return useQuery({
    queryKey: ['reports', 'volumes', reportId] as const,
    queryFn: () => unwrap(api.v1.reports({ reportId }).volumes.get()),
  });
}

export function useReplaceVolumes(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: VolumeEntriesPut) =>
      unwrap(api.v1.reports({ reportId }).volumes.put(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function usePumpReadings(reportId: string) {
  return useQuery({
    queryKey: ['reports', 'pump-readings', reportId] as const,
    queryFn: async () => (await unwrap(api.v1.reports({ reportId })['pump-readings'].get())).data,
  });
}

export function useReplacePumpReadings(reportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PumpReadingsPut) =>
      unwrap(api.v1.reports({ reportId })['pump-readings'].put(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reportKeys.all }),
  });
}
