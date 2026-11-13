import api from "@/lib/axios";
import type { CreateReportInput, Report, ReportListItem, UpdateReportInput } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const reportApi = {
  list: async () => (await api.get<ReportListItem[]>("/v1/reports")).data,
  create: async (input: CreateReportInput) => (await api.post<Report>("/v1/reports", input)).data,
  edit: async (id: string, input: UpdateReportInput) =>
    (await api.patch<Report>(`/v1/reports/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/reports/${id}`);
  },
};
