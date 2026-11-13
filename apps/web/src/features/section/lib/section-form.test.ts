/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import type { Section } from "../type";
import {
  defaultValues,
  type SectionFormValues,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
} from "./section-form";

const values: SectionFormValues = { wellId: "well-1", sequence: "2", name: '  12 1/4" hole ' };

describe("validate", () => {
  it("passes for a filled form", () => {
    expect(validate({ value: values })).toBeUndefined();
  });

  it("asks for every field on an empty form", () => {
    const result = validate({ value: defaultValues });
    expect(Object.keys(result?.fields ?? {}).sort()).toEqual(["name", "sequence", "wellId"]);
  });

  it.each(["0", "-1", "1.5", "abc"])("rejects a sequence of %p", (sequence) => {
    expect(validate({ value: { ...values, sequence } })?.fields.sequence).toBeDefined();
  });

  it("rejects a name that is only whitespace", () => {
    expect(validate({ value: { ...values, name: "   " } })?.fields.name).toBeDefined();
  });
});

describe("toPayload", () => {
  it("converts the sequence to a number and trims the name", () => {
    expect(toPayload(values)).toEqual({ wellId: "well-1", sequence: 2, name: '12 1/4" hole' });
  });

  it("leaves the well out of an update", () => {
    expect("wellId" in toUpdatePayload(values)).toBe(false);
  });
});

describe("toFormValues", () => {
  it("turns a section into form strings", () => {
    const section: Section = {
      id: "s1",
      wellId: "well-1",
      sequence: 3,
      name: "Surface",
      createdAt: "",
      updatedAt: "",
    };
    expect(toFormValues(section)).toEqual({ wellId: "well-1", sequence: "3", name: "Surface" });
  });
});
