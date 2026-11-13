import api from "@/lib/axios";
import type { CreateSectionInput, Section, SectionListItem, UpdateSectionInput } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const sectionApi = {
  list: async () => (await api.get<SectionListItem[]>("/v1/sections")).data,
  create: async (input: CreateSectionInput) =>
    (await api.post<Section>("/v1/sections", input)).data,
  edit: async (id: string, input: UpdateSectionInput) =>
    (await api.patch<Section>(`/v1/sections/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/sections/${id}`);
  },
};
