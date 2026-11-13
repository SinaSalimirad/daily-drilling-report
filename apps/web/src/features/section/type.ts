// Mirrors the JSON the API returns for a section row.
export type Section = {
  id: string;
  wellId: string;
  sequence: number; // order of the section within its well
  name: string;
  createdAt: string;
  updatedAt: string;
};

// GET /sections also returns the name of the section's well.
export type SectionListItem = Section & { wellName: string };

// Body of POST /sections.
export type CreateSectionInput = {
  wellId: string;
  sequence: number;
  name: string;
};

// Body of PATCH /sections/:id. The well can't be changed.
export type UpdateSectionInput = Partial<Omit<CreateSectionInput, "wellId">>;
