import type { ReportActivitiesPut, ReportCreate, ReportUpdate } from '@ddr/schemas';
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
