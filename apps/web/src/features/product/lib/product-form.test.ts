/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import {
  defaultValues,
  type ProductFormValues,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
} from "./product-form";

const validValues: ProductFormValues = {
  ...defaultValues,
  name: "Barite",
  size: "25",
  unit: "kg",
  origin: "local",
};

const errorsFor = (overrides: Partial<ProductFormValues>) =>
  validate({ value: { ...validValues, ...overrides } })?.fields;

describe("validate", () => {
  it("accepts a product with only the required fields", () => {
    expect(errorsFor({})).toBeUndefined();
  });

  it("requires every required field when the form is empty", () => {
    const fields = validate({ value: defaultValues })?.fields;

    expect(Object.keys(fields ?? {}).sort()).toEqual(["name", "origin", "size", "unit"]);
  });

  it("rejects a name that is only whitespace", () => {
    expect(errorsFor({ name: "   " })?.name).toBeDefined();
  });

  it.each(["0", "-5", "abc"])("rejects size %p", (size) => {
    expect(errorsFor({ size })?.size).toBe("Must be greater than 0");
  });

  it("accepts a decimal size", () => {
    expect(errorsFor({ size: "0.5" })).toBeUndefined();
  });

  it("treats blank optional numbers as empty, not as errors", () => {
    expect(errorsFor({ specificGravity: "  " })).toBeUndefined();
  });

  it("rejects an optional number of zero", () => {
    expect(errorsFor({ specificGravity: "0" })?.specificGravity).toBe("Must be greater than 0");
  });

  it("asks for height when only width is filled", () => {
    expect(errorsFor({ width: "10" })?.height).toBe("Width and height must be provided together");
  });

  it("asks for width when only height is filled", () => {
    expect(errorsFor({ height: "10" })?.width).toBe("Width and height must be provided together");
  });

  it("keeps the 'must be greater than 0' message when the filled side is invalid", () => {
    expect(errorsFor({ width: "-1" })?.width).toBe("Must be greater than 0");
  });

  it("accepts width together with height", () => {
    expect(errorsFor({ width: "10", height: "5" })).toBeUndefined();
  });
});

describe("toPayload", () => {
  it("converts numbers, trims the name and leaves blank optionals undefined", () => {
    expect(toPayload({ ...validValues, name: "  Barite  " })).toEqual({
      name: "Barite",
      size: 25,
      unit: "kg",
      origin: "local",
      width: undefined,
      height: undefined,
      specificGravity: undefined,
    });
  });

  it("converts filled optional numbers", () => {
    const payload = toPayload({
      ...validValues,
      width: "10",
      height: "5.5",
      specificGravity: "4.2",
    });

    expect(payload).toMatchObject({ width: 10, height: 5.5, specificGravity: 4.2 });
  });
});

describe("toFormValues / toUpdatePayload", () => {
  const product = {
    id: "1",
    name: "Barite",
    size: 25,
    unit: "kg",
    origin: "local",
    width: null,
    height: null,
    specificGravity: 4.2,
    createdAt: "",
    updatedAt: "",
  } as const;

  it("turns null optional values into empty strings", () => {
    expect(toFormValues(product)).toEqual({
      name: "Barite",
      size: "25",
      unit: "kg",
      origin: "local",
      width: "",
      height: "",
      specificGravity: "4.2",
    });
  });

  it("sends null for cleared optional fields so the API clears them", () => {
    const payload = toUpdatePayload({ ...toFormValues(product), specificGravity: "" });

    expect(payload.specificGravity).toBeNull();
    expect(payload.width).toBeNull();
    expect(payload.height).toBeNull();
    expect(payload.size).toBe(25);
  });
});
