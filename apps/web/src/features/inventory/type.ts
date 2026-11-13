import type { ProductUnit } from "../product/constants";

// Mirrors the JSON the API returns for an inventory row (numeric columns use `mode: "number"`).
export type Inventory = {
  id: string;
  reportId: string;
  productId: string;
  init: number;
  used: number;
  received: number;
  returned: number;
  unitPrice: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

// GET /inventories also returns the details of the row's report, well and product, and
// `final`: the stock left at the end of the report, calculated by the API.
export type InventoryListItem = Inventory & {
  wellId: string;
  wellName: string;
  reportNumber: number;
  reportDate: string; // "YYYY-MM-DD"
  productName: string;
  productSize: number;
  productUnit: ProductUnit;
  final: number;
};

// Body of POST /inventories. Quantities default to 0 on the server when left out.
export type CreateInventoryInput = {
  reportId: string;
  productId: string;
  init?: number;
  used?: number;
  received?: number;
  returned?: number;
  unitPrice?: number | null;
  note?: string | null;
};

// Body of PATCH /inventories/:id. reportId and productId can't be changed.
export type UpdateInventoryInput = Partial<Omit<CreateInventoryInput, "reportId" | "productId">>;
