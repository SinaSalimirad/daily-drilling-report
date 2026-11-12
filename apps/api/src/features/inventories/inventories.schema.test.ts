import { describe, expect, it } from "bun:test";
import { insertInventorySchema, updateInventorySchema } from "./inventories.schema";

const validInventory = {
  reportId: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
  productId: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5c",
};

describe("insertInventorySchema", () => {
  it("accepts an inventory with only reportId and productId", () => {
    expect(insertInventorySchema.safeParse(validInventory).success).toBe(true);
  });

  it("rejects a negative quantity", () => {
    expect(insertInventorySchema.safeParse({ ...validInventory, used: -1 }).success).toBe(false);
  });

  it("rejects a fractional quantity", () => {
    expect(insertInventorySchema.safeParse({ ...validInventory, init: 1.5 }).success).toBe(false);
  });

  it("rejects a unit price of zero", () => {
    expect(insertInventorySchema.safeParse({ ...validInventory, unitPrice: 0 }).success).toBe(
      false,
    );
  });

  it("coerces unit price to a number", () => {
    const result = insertInventorySchema.safeParse({ ...validInventory, unitPrice: "12.5" });
    expect(result.success && result.data.unitPrice).toBe(12.5);
  });

  it("rejects an invalid reportId", () => {
    expect(insertInventorySchema.safeParse({ ...validInventory, reportId: "x" }).success).toBe(
      false,
    );
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertInventorySchema.safeParse({
      ...validInventory,
      id: "x",
      createdAt: new Date(),
    });
    expect(result.success && "id" in result.data).toBe(false);
  });
});

describe("updateInventorySchema", () => {
  it("accepts a partial body", () => {
    expect(updateInventorySchema.safeParse({ used: 3 }).success).toBe(true);
  });

  it("strips reportId and productId", () => {
    const result = updateInventorySchema.safeParse({ used: 3, ...validInventory });
    expect(result.success && "reportId" in result.data).toBe(false);
  });
});
