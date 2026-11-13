import type { CurrencyCode, RigType } from "./constants";

// Mirrors the JSON the API returns for a project row. Every column is required.
export type Project = {
  id: string;
  name: string;
  operators: string[];
  contractors: string[];
  field: string;
  rigName: string;
  rigType: RigType;
  currencyCode: CurrencyCode;
  createdAt: string;
  updatedAt: string;
};

// Body of POST /projects.
export type CreateProjectInput = {
  name: string;
  operators: string[];
  contractors: string[];
  field: string;
  rigName: string;
  rigType: RigType;
  currencyCode: CurrencyCode;
};

// Body of PATCH /projects/:id. The form always sends every field.
export type UpdateProjectInput = Partial<CreateProjectInput>;
