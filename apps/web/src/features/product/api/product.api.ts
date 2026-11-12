import api from "@/lib/axios";
import type { CreateProductInput, Product } from "../type";

// Each function returns the response body, so callers never deal with AxiosResponse.
export const productApi = {
  list: async () => (await api.get<Product[]>("/products")).data,
  create: async (input: CreateProductInput) => (await api.post<Product>("/products", input)).data,
  // add edit (put) here
  remove: async (id: string) => {
    await api.delete(`/products/${id}`);
  },
};
