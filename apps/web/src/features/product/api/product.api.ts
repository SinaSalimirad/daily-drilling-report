import api from "@/lib/axios";
import type { CreateProductInput, Product } from "../type";

export const productApi = {
  list: () => api.get<Product[]>("/products"),
  create: (input: CreateProductInput) => api.post("/products", input),
  remove: (id: string) => api.delete(`/reports/${id}`),
};
