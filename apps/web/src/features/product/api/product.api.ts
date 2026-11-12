import api from "@/lib/axios";
import type { CreateProductInput, Product, UpdateProductInput } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const productApi = {
  list: async () => (await api.get<Product[]>("/v1/products")).data,
  create: async (input: CreateProductInput) =>
    (await api.post<Product>("/v1/products", input)).data,
  edit: async (id: string, input: UpdateProductInput) =>
    (await api.patch<Product>(`/v1/products/${id}`, input)).data,
  remove: async (id: string) => {
    await api.delete(`/v1/products/${id}`);
  },
};
