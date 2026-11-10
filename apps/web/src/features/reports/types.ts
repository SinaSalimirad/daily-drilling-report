export type Report = {
  id: number;
  wellName: string;
  reportDate: string;
  depthM: number;
  mudWeightPpg: string;
  notes: string | null;
  createdAt: string;
};

export type CreateReportInput = {
  wellName: string;
  reportDate: string;
  depthM: number;
  mudWeightPpg: number;
  notes?: string;
};
