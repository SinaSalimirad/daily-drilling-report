import { describe, expect, it } from "bun:test";
import { insertProductSchema, ProductOrigin, ProductUnit } from "./products.schema";

const validProduct = {
  name: "Barite",
  size: 25,
  unit: ProductUnit.Kilogram,
  origin: ProductOrigin.Local,
};

describe("insertProductSchema", () => {
  it("accepts a product with only the required fields", () => {
    expect(insertProductSchema.safeParse(validProduct).success).toBe(true);
  });

  it("rejects a size of zero", () => {
    expect(insertProductSchema.safeParse({ ...validProduct, size: 0 }).success).toBe(false);
  });

  it("rejects width without height", () => {
    expect(insertProductSchema.safeParse({ ...validProduct, width: 10 }).success).toBe(false);
  });

  it("accepts width together with height", () => {
    expect(insertProductSchema.safeParse({ ...validProduct, width: 10, height: 5 }).success).toBe(
      true,
    );
  });

  it("rejects an unknown unit", () => {
    expect(insertProductSchema.safeParse({ ...validProduct, unit: "stone" }).success).toBe(false);
  });

  it("strips id and timestamps sent by the client", () => {
    const result = insertProductSchema.safeParse({
      ...validProduct,
      id: "x",
      createdAt: new Date(),
    });
    expect(result.success && "id" in result.data).toBe(false);
  });
});
