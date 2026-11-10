import { http } from "@/lib/axios";
import type { CreateReportInput, Report } from "../types";

export const reportsApi = {
  list: () => http.get<Report[]>("/reports").then((r) => r.data),
  create: (input: CreateReportInput) => http.post<Report>("/reports", input).then((r) => r.data),
  remove: (id: number) => http.delete(`/reports/${id}`).then(() => undefined),
};
