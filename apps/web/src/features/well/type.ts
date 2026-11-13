import type { Designation, RigType, WellType } from "./constants";

// Mirrors the JSON the API returns for a well row.
export type Well = {
  id: string;
  projectId: string;
  name: string;
  designation: Designation;
  spudDate: string; // "YYYY-MM-DD"
  wellType: WellType;
  rigName: string;
  rigType: RigType;
  waterDepthM: number | null; // only offshore wells have one
  createdAt: string;
  updatedAt: string;
};

// GET /wells also returns the name of the well's project.
export type WellListItem = Well & { projectName: string };

// Body of POST /wells.
export type CreateWellInput = {
  projectId: string;
  name: string;
  designation: Designation;
  spudDate: string;
  wellType: WellType;
  rigName: string;
  rigType: RigType;
  waterDepthM: number | null;
};

// Body of PATCH /wells/:id. The project can't be changed, and rigType and
// waterDepthM must be sent together. The form always sends every field.
export type UpdateWellInput = Partial<Omit<CreateWellInput, "projectId">>;
