/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import type { InventoryListItem } from "../type";
import {
  defaultValues,
  type InventoryFormValues,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
} from "./inventory-form";

const values: InventoryFormValues = {
  wellId: "well-1",
  reportId: "report-1",
  productId: "product-1",
  init: "10",
  received: "5",
  used: "3",
  returned: "1",
  unitPrice: "12.5",
  note: " from the store ",
};

describe("validate", () => {
  it("passes for a filled form", () => {
    expect(validate({ value: values })).toBeUndefined();
  });

  it("asks only for the well, report and product on an empty form", () => {
    const result = validate({ value: defaultValues });
    expect(Object.keys(result?.fields ?? {}).sort()).toEqual(["productId", "reportId", "wellId"]);
  });

  it("accepts a quantity of 0", () => {
    expect(validate({ value: { ...values, used: "0" } })).toBeUndefined();
  });

  it.each(["-1", "1.5", ""])("rejects a quantity of %p", (used) => {
    expect(validate({ value: { ...values, used } })?.fields.used).toBeDefined();
  });

  it("allows the unit price to be left empty", () => {
    expect(validate({ value: { ...values, unitPrice: "" } })).toBeUndefined();
  });

  it("rejects a unit price of 0", () => {
    expect(validate({ value: { ...values, unitPrice: "0" } })?.fields.unitPrice).toBeDefined();
  });
});

describe("toPayload", () => {
  it("converts numbers and trims the note", () => {
    const payload = toPayload(values);
    expect(payload.init).toBe(10);
    expect(payload.unitPrice).toBe(12.5);
    expect(payload.note).toBe("from the store");
  });

  it("sends null for an empty price and note", () => {
    const payload = toPayload({ ...values, unitPrice: "", note: "  " });
    expect(payload.unitPrice).toBeNull();
    expect(payload.note).toBeNull();
  });

  it("leaves the report and product out of an update", () => {
    const payload = toUpdatePayload(values);
    expect("reportId" in payload).toBe(false);
    expect("productId" in payload).toBe(false);
  });
});

describe("toFormValues", () => {
  it("round-trips an inventory row through the form", () => {
    const row: InventoryListItem = {
      id: "i1",
      reportId: "report-1",
      productId: "product-1",
      init: 10,
      received: 5,
      used: 3,
      returned: 1,
      unitPrice: null,
      note: null,
      createdAt: "",
      updatedAt: "",
      wellId: "well-1",
      wellName: "Well A",
      reportNumber: 1,
      reportDate: "2026-03-01",
      productName: "Barite",
      productSize: 25,
      productUnit: "kg",
      final: 11,
    };

    expect(toFormValues(row)).toEqual({ ...values, unitPrice: "", note: "" });
  });
});
