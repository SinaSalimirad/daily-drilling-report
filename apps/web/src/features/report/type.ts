// Mirrors the JSON the API returns for a report row.
export type Report = {
  id: string;
  wellId: string;
  sectionId: string;
  reportNumber: number;
  date: string; // "YYYY-MM-DD"
  operatorReporter: string;
  contractorReporter: string;
  wellStatus: string;
  mudType: string;
  presentActivity: string;
  bitDepth: number;
  totalDepth: number;
  tvd: number;
  createdAt: string;
  updatedAt: string;
};

// GET /reports also returns the names of the report's well and section.
export type ReportListItem = Report & { wellName: string; sectionName: string };

// Body of POST /reports.
export type CreateReportInput = Omit<Report, "id" | "createdAt" | "updatedAt">;

// Body of PATCH /reports/:id. The well can't be changed; the form always sends every field.
export type UpdateReportInput = Partial<Omit<CreateReportInput, "wellId">>;
