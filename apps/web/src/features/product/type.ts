import type { ProductOrigin, ProductUnit } from "./constants";

// Mirrors the JSON the API returns for a product row (numeric columns use `mode: "number"`).
export type Product = {
  id: string;
  name: string;
  size: number;
  unit: ProductUnit;
  width: number | null;
  height: number | null;
  specificGravity: number | null;
  origin: ProductOrigin | null;
  price: number | null;
  createdAt: string;
  updatedAt: string;
};

// Body of POST /products. Optional fields are left out when the user did not fill them.
export type CreateProductInput = {
  name: string;
  size: number;
  unit: ProductUnit;
  width?: number;
  height?: number;
  specificGravity?: number;
  origin?: ProductOrigin;
  price?: number;
};
