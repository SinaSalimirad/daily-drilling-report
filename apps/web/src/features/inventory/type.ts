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
