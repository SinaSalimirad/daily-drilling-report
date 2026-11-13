/// <reference types="bun-types" />
import { describe, expect, it } from "bun:test";
import type { Report } from "../type";
import {
  defaultValues,
  isValidDate,
  type ReportFormValues,
  toFormValues,
  toPayload,
  toUpdatePayload,
  validate,
} from "./report-form";

const values: ReportFormValues = {
  wellId: "well-1",
  sectionId: "section-1",
  reportNumber: "4",
  date: "2026-03-01",
  operatorReporter: " A. Rezaei ",
  contractorReporter: "B. Karimi",
  wellStatus: "Drilling",
  mudType: "WBM",
  presentActivity: "Drilling 12 1/4 hole",
  bitDepth: "1200.5",
  totalDepth: "1200.5",
  tvd: "1180",
};

describe("isValidDate", () => {
  it("accepts a real date and rejects an impossible one", () => {
    expect(isValidDate("2026-03-01")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("01/03/2026")).toBe(false);
  });
});

describe("validate", () => {
  it("passes for a filled form", () => {
    expect(validate({ value: values })).toBeUndefined();
  });

  it("asks for every field on an empty form", () => {
    const result = validate({ value: defaultValues });
    expect(Object.keys(result?.fields ?? {}).sort()).toEqual(Object.keys(values).sort());
  });

  it.each(["0", "-1", "1.5"])("rejects a report number of %p", (reportNumber) => {
    expect(validate({ value: { ...values, reportNumber } })?.fields.reportNumber).toBeDefined();
  });

  it.each(["bitDepth", "totalDepth", "tvd"] as const)("rejects a %s of 0", (key) => {
    expect(validate({ value: { ...values, [key]: "0" } })?.fields[key]).toBeDefined();
  });

  it("rejects a text field that is only whitespace", () => {
    expect(validate({ value: { ...values, mudType: "   " } })?.fields.mudType).toBeDefined();
  });

  it("rejects a date that is not a calendar date", () => {
    expect(validate({ value: { ...values, date: "2026-02-30" } })?.fields.date).toBeDefined();
  });
});

describe("toPayload", () => {
  it("converts numbers and trims text", () => {
    const payload = toPayload(values);
    expect(payload.reportNumber).toBe(4);
    expect(payload.bitDepth).toBe(1200.5);
    expect(payload.operatorReporter).toBe("A. Rezaei");
  });

  it("leaves the well out of an update", () => {
    expect("wellId" in toUpdatePayload(values)).toBe(false);
  });
});

describe("toFormValues", () => {
  it("round-trips a report through the form", () => {
    const report: Report = { ...toPayload(values), id: "r1", createdAt: "", updatedAt: "" };
    expect(toFormValues(report)).toEqual({ ...values, operatorReporter: "A. Rezaei" });
  });
});
